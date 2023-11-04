pub mod commands;
mod error;
mod hd_wallet;
mod impersonator;
mod init;
mod json_keystore_wallet;
mod plaintext;
mod utils;
mod wallet;

use std::{
    collections::HashSet,
    fs::File,
    path::{Path, PathBuf},
};

pub use error::{Error, Result};
pub use init::init;
use iron_types::{Address, Json, UINotify};
use serde::Serialize;

use self::wallet::WalletCreate;
pub use self::wallet::{Wallet, WalletControl};

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
    pub async fn find(&self, address: Address) -> Option<(&Wallet, String)> {
        for w in self.wallets.iter() {
            if let Some(path) = w.find(address).await {
                return Some((w, path));
            }
        }

        None
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
    async fn set_current_path(&mut self, key: String) -> Result<()> {
        self.wallets[self.current].set_current_path(key).await?;
        self.on_wallet_changed().await?;
        self.save()?;
        Ok(())
    }

    async fn get_current_address(&self) -> Address {
        self.get_current_wallet().get_current_address().await
    }

    /// Switches the current default wallet
    async fn set_current_wallet(&mut self, id: usize) -> Result<()> {
        if id >= self.wallets.len() {
            return Err(Error::InvalidWallet(id));
        }

        self.current = id;
        self.on_wallet_changed().await?;
        self.save()?;
        Ok(())
    }

    /// Retrieves all wallets
    fn get_all(&self) -> &Vec<Wallet> {
        &self.wallets
    }

    async fn create(&mut self, params: Json) -> Result<()> {
        let wallet = Wallet::create(params).await?;
        let addresses = wallet.get_all_addresses().await;

        self.ensure_no_duplicates_of(&wallet.name())?;

        // TODO: ensure no duplicates
        self.wallets.push(wallet);

        self.on_wallet_changed().await?;
        self.save()?;

        for (_, a) in addresses {
            iron_broadcast::address_added(a).await;
        }

        Ok(())
    }

    async fn update(&mut self, name: String, params: Json) -> Result<()> {
        let i = self
            .wallets
            .iter()
            .position(|w| w.name() == name)
            .ok_or(Error::InvalidWalletName(name))?;

        let before = self.wallets[i].get_all_addresses().await;
        self.wallets[i] = self.wallets[i].clone().update(params).await?;
        let after = self.wallets[i].get_all_addresses().await;

        tokio::spawn(async move {
            let before: HashSet<_> = before.into_iter().collect();
            let after: HashSet<_> = after.into_iter().collect();
            for (_, a) in after.difference(&before) {
                iron_broadcast::address_added(*a).await;
            }
            for (_, a) in before.difference(&after) {
                iron_broadcast::address_removed(*a).await;
            }
        });

        self.ensure_current();
        self.notify_peers().await;
        self.on_wallet_changed().await?;
        self.save()?;
        Ok(())
    }

    async fn remove(&mut self, name: String) -> Result<()> {
        let found = self
            .wallets
            .iter()
            .enumerate()
            .find(|(_, w)| w.name() == name);

        if let Some((i, _)) = found {
            let removed = self.wallets.remove(i);

            for (_, a) in removed.get_all_addresses().await {
                iron_broadcast::address_removed(a).await;
            }

            self.ensure_current();
            self.on_wallet_changed().await?;
            self.save()?;
        }

        Ok(())
    }

    /// Get all addresses currently enabled in a given wallet
    async fn get_wallet_addresses(&self, name: String) -> Vec<(String, Address)> {
        let wallet = self.find_wallet(&name).unwrap();

        wallet.get_all_addresses().await
    }

    /// Finds a wallet by its name
    fn find_wallet(&self, id: &String) -> Option<&Wallet> {
        self.wallets.iter().find(|w| w.name() == *id)
    }

    /// Persists current state to disk
    fn save(&self) -> Result<()> {
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
                .push(Wallet::Plaintext(plaintext::PlaintextWallet::default()));
        }

        if self.current >= self.wallets.len() {
            self.current = 0;
        }
    }

    async fn init_broadcast(&self) {
        for wallet in self.wallets.iter() {
            for (_, addr) in wallet.get_all_addresses().await {
                iron_broadcast::address_added(addr).await;
            }
        }

        let addr = self.get_current_address().await;
        iron_broadcast::current_address_changed(addr).await;
    }

    async fn on_wallet_changed(&self) -> Result<()> {
        let addr = self.get_current_address().await;

        self.notify_peers().await;
        iron_broadcast::ui_notify(UINotify::WalletsChanged).await;
        iron_broadcast::current_address_changed(addr).await;

        Ok(())
    }

    // broadcasts `accountsChanged` to all peers
    async fn notify_peers(&self) {
        let addresses = vec![self.get_current_wallet().get_current_address().await];
        iron_broadcast::accounts_changed(addresses).await;
    }

    fn ensure_no_duplicates_of(&self, name: &str) -> Result<()> {
        if self.wallets.iter().any(|w| w.name() == name) {
            return Err(Error::DuplicateWalletNames(name.to_owned()));
        }
        Ok(())
    }
}
