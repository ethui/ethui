pub mod commands;
mod error;
mod hd_wallet;
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
use iron_types::{AppEvent, AppNotify, ChecksummedAddress, Json};
use serde::Serialize;
use tokio::sync::mpsc;

use self::wallet::WalletCreate;
pub use self::{
    json_keystore_wallet::JsonKeystoreWallet,
    plaintext::PlaintextWallet,
    wallet::{Wallet, WalletControl},
};

/// Maintains a list of Ethereum wallets, including keeping track of the global current wallet &
/// address
#[derive(Debug, Serialize)]
pub struct Wallets {
    wallets: Vec<Wallet>,

    #[serde(default)]
    current: usize,

    #[serde(skip)]
    window_snd: mpsc::UnboundedSender<AppEvent>,

    #[serde(skip)]
    file: Option<PathBuf>,
}

impl Wallets {
    /// Gets a reference the current default wallet
    pub fn get_current_wallet(&self) -> &Wallet {
        &self.wallets[self.current]
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

    /// Resets the list of wallets to a new one
    async fn set_wallets(&mut self, wallets: Vec<Wallet>) -> Result<()> {
        if let Some(n) = find_duplicates(&wallets) {
            return Err(Error::DuplicateWalletNames(n));
        }
        // TODO: should fail if wallets with duplicate names exist

        self.wallets = wallets;
        self.ensure_current();
        self.on_wallet_changed().await?;
        self.save()?;

        Ok(())
    }

    async fn create(&mut self, params: Json) -> Result<()> {
        let wallet = Wallet::create(params).await?;
        // TODO: ensure no duplicates
        self.wallets.push(wallet);
        self.on_wallet_changed().await?;
        self.save()?;
        Ok(())
    }

    async fn update(&mut self, name: String, params: Json) -> Result<()> {
        // TODO: should fail if no wallet of that name exists
        let i = self.wallets.iter().position(|w| w.name() == name).unwrap();

        self.wallets[i] = self.wallets[i].clone().update(params).await?;

        self.ensure_current();
        self.notify_peers().await;
        self.on_wallet_changed().await?;
        self.save()?;
        Ok(())
    }

    async fn remove(&mut self, name: String) -> Result<()> {
        let new = self
            .wallets
            .iter()
            .filter(|w| w.name() != name)
            .cloned()
            .collect();

        self.wallets = new;
        self.ensure_current();
        self.on_wallet_changed().await?;
        self.save()?;
        Ok(())
    }

    /// Get all addresses currently enabled in a given wallet
    async fn get_wallet_addresses(&self, name: String) -> Vec<(String, ChecksummedAddress)> {
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
                .push(Wallet::Plaintext(PlaintextWallet::default()));
        }

        if self.current >= self.wallets.len() {
            self.current = 0;
        }
    }

    async fn on_wallet_changed(&self) -> Result<()> {
        self.notify_peers().await;
        self.window_snd.send(AppNotify::WalletsChanged.into())?;

        Ok(())
    }

    // broadcasts `accountsChanged` to all peers
    async fn notify_peers(&self) {
        let addresses = vec![self.get_current_wallet().get_current_address().await];
        iron_broadcast::accounts_changed(addresses).await;
    }
}

fn find_duplicates(wallets: &[Wallet]) -> Option<String> {
    let mut uniq = HashSet::new();
    for wallet in wallets.iter() {
        let name = wallet.name();
        if uniq.contains(&name) {
            return Some(name);
        }
        uniq.insert(name);
    }

    None
}
