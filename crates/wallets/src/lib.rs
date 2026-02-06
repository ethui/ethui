pub mod commands;
mod init;
pub(crate) mod secret_cache;
mod signer;
mod utils;
mod wallet;
mod wallets;

use std::{
    collections::HashSet,
    fs::File,
    path::{Path, PathBuf},
};

use color_eyre::eyre::{ContextCompat as _, eyre};
use ethui_types::{Address, GlobalState, Json, UINotify};
pub use init::init;
use serde::Serialize;
pub use signer::Signer;

pub use self::wallet::{Wallet, WalletControl, WalletType};

pub async fn find_wallet(address: Address) -> color_eyre::Result<Option<(Wallet, String)>> {
    let wallets = Wallets::read().await;
    Ok(wallets
        .find(address)
        .await?
        .map(|(wallet, path)| (wallet.clone(), path)))
}

pub async fn get_current_wallet() -> Wallet {
    Wallets::read().await.get_current_wallet().clone()
}

/// Maintains a list of Ethereum wallets, including keeping track of the global current wallet &
/// address
#[derive(Debug, Serialize)]
pub struct Wallets {
    wallets: Vec<Wallet>,

    #[serde(default)]
    current: usize,

    #[serde(skip)]
    file: Option<PathBuf>,
}

impl Wallets {
    pub async fn find(&self, address: Address) -> color_eyre::Result<Option<(&Wallet, String)>> {
        for w in self.wallets.iter() {
            if let Some(path) = w.find(address).await? {
                return Ok(Some((w, path)));
            }
        }

        Ok(None)
    }

    /// Gets a reference the current default wallet
    pub fn get_current_wallet(&self) -> &Wallet {
        &self.wallets[self.current]
    }

    pub fn get(&self, name: &str) -> Option<&Wallet> {
        self.wallets.iter().find(|w| w.name() == name)
    }

    /// Sets the current key within the current default
    ///
    /// Since wallets actually contain multiple addresses, we need the ability to connect to a
    /// different one within the same wallet
    async fn set_current_path(&mut self, key: String) -> color_eyre::Result<()> {
        self.wallets[self.current].set_current_path(key).await?;
        self.on_wallet_changed().await?;
        self.save()?;
        Ok(())
    }

    async fn get_current_address(&self) -> color_eyre::Result<Address> {
        self.get_current_wallet().get_current_address().await
    }

    /// Switches the current default wallet
    async fn set_current_wallet(&mut self, id: usize) -> color_eyre::Result<()> {
        if id >= self.wallets.len() {
            return Err(eyre!("invalid wallet index {}", id));
        }

        self.current = id;
        self.on_wallet_changed().await?;

        let wallet_type = self.wallets[id].wallet_type();
        ethui_broadcast::wallet_connected(wallet_type.to_string()).await;

        self.save()?;
        Ok(())
    }

    /// Retrieves all wallets
    fn get_all(&self) -> &Vec<Wallet> {
        &self.wallets
    }

    pub async fn get_all_addresses(&self) -> color_eyre::Result<Vec<(String, Address)>> {
        let mut res = vec![];
        for wallet in self.wallets.iter() {
            res.extend(wallet.get_all_addresses().await?.into_iter());
        }

        Ok(res)
    }

    async fn create(&mut self, params: Json) -> color_eyre::Result<()> {
        let wallet = Wallet::create(params).await?;
        let addresses = wallet.get_all_addresses().await?;

        self.ensure_no_duplicates_of(&wallet.name())?;

        // TODO: ensure no duplicates
        self.wallets.push(wallet);

        self.on_wallet_changed().await?;
        self.save()?;

        ethui_broadcast::wallet_created().await;

        for (_, a) in addresses {
            ethui_broadcast::address_added(a).await;
        }

        Ok(())
    }

    async fn update(&mut self, name: String, params: Json) -> color_eyre::Result<()> {
        let i = self
            .wallets
            .iter()
            .position(|w| w.name() == name)
            .with_context(|| format!("invalid wallet name `{name}`"))?;

        let before = self.wallets[i].get_all_addresses().await?;
        self.wallets[i] = self.wallets[i].clone().update(params).await?;
        let after = self.wallets[i].get_all_addresses().await?;

        tokio::spawn(async move {
            let before: HashSet<_> = before.into_iter().collect();
            let after: HashSet<_> = after.into_iter().collect();
            for (_, a) in after.difference(&before) {
                ethui_broadcast::address_added(*a).await;
            }
            for (_, a) in before.difference(&after) {
                ethui_broadcast::address_removed(*a).await;
            }
        });

        self.ensure_current();
        self.notify_peers().await?;
        self.on_wallet_changed().await?;
        self.save()?;
        Ok(())
    }

    async fn remove(&mut self, name: String) -> color_eyre::Result<()> {
        let found = self
            .wallets
            .iter()
            .enumerate()
            .find(|(_, w)| w.name() == name);

        if let Some((i, _)) = found {
            let removed = self.wallets.remove(i);

            for (_, a) in removed.get_all_addresses().await? {
                ethui_broadcast::address_removed(a).await;
            }

            self.ensure_current();
            self.on_wallet_changed().await?;
            self.save()?;
        }

        Ok(())
    }

    /// Get all addresses currently enabled in a given wallet
    async fn get_wallet_addresses(
        &self,
        name: String,
    ) -> color_eyre::Result<Vec<(String, Address)>> {
        let wallet = self
            .find_wallet(&name)
            .ok_or_else(|| eyre!("wallet not found: {name}"))?;

        wallet.get_all_addresses().await
    }

    /// Finds a wallet by its name
    fn find_wallet(&self, id: &String) -> Option<&Wallet> {
        self.wallets.iter().find(|w| w.name() == *id)
    }

    /// Persists current state to disk
    fn save(&self) -> color_eyre::Result<()> {
        let pathbuf = self.file.clone().unwrap();
        let path = Path::new(&pathbuf);
        let file = File::create(path)?;

        serde_json::to_writer_pretty(file, self)?;

        Ok(())
    }

    /// Ensures that self.current never points to an invalid wallet
    fn ensure_current(&mut self) {
        if self.wallets.is_empty() {
            self.wallets
                .push(Wallet::Plaintext(wallets::PlaintextWallet::default()));
        }

        if self.current >= self.wallets.len() {
            self.current = 0;
        }
    }

    async fn init_broadcast(&self) -> color_eyre::Result<()> {
        for wallet in self.wallets.iter() {
            for (_, addr) in wallet.get_all_addresses().await? {
                ethui_broadcast::address_added(addr).await;
            }
        }

        let addr = self.get_current_address().await?;
        ethui_broadcast::current_address_changed(addr).await;
        Ok(())
    }

    async fn on_wallet_changed(&self) -> color_eyre::Result<()> {
        let addr = self.get_current_address().await?;

        self.notify_peers().await?;
        ethui_broadcast::ui_notify(UINotify::WalletsChanged).await;
        ethui_broadcast::current_address_changed(addr).await;

        Ok(())
    }

    // broadcasts `accountsChanged` to all peers
    async fn notify_peers(&self) -> color_eyre::Result<()> {
        let addresses = vec![self.get_current_wallet().get_current_address().await?];
        ethui_broadcast::accounts_changed(addresses).await;
        Ok(())
    }

    fn ensure_no_duplicates_of(&self, name: &str) -> color_eyre::Result<()> {
        if self.wallets.iter().any(|w| w.name() == name) {
            return Err(eyre!("duplicate wallet names `{}`", name));
        }
        Ok(())
    }
}
