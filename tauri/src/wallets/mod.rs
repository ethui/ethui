pub mod commands;
mod error;
mod global;
mod json_keystore_wallet;
mod plaintext;
mod wallet;
mod wrapper;

use std::{
    collections::HashSet,
    fs::File,
    path::{Path, PathBuf},
};

pub use error::{Error, Result};
use serde::{Deserialize, Serialize};

pub use self::{
    json_keystore_wallet::JsonKeystoreWallet,
    plaintext::PlaintextWallet,
    wallet::{Wallet, WalletControl},
};
use crate::{
    peers::Peers,
    types::{ChecksummedAddress, GlobalState},
};

/// Maintains a list of Ethereum wallets, including keeping track of the global current wallet &
/// address
#[derive(Default, Debug, Serialize, Deserialize)]
pub struct Wallets {
    #[serde(skip)]
    wallets: Vec<Wallet>,

    #[serde(default)]
    current: usize,

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
        self.wallets[self.current].set_current_path(&key).await?;
        self.notify_peers().await;
        self.save()?;
        Ok(())
    }

    /// Switches the current default wallet
    async fn set_current_wallet(&mut self, id: usize) -> Result<()> {
        if id >= self.wallets.len() {
            return Err(Error::InvalidWallet(id));
        }

        self.current = id;
        self.notify_peers().await;
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
        self.notify_peers().await;
        self.save()?;

        Ok(())
    }

    /// Get all addresses currently enabled in a given wallet
    async fn get_wallet_addresses(&self, name: String) -> Vec<(String, ChecksummedAddress)> {
        let wallet = self.find_wallet(&name).unwrap();

        wallet.derive_all_addresses().await.unwrap()
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

    // broadcasts `accountsChanged` to all peers
    async fn notify_peers(&self) {
        let addresses = vec![self.get_current_wallet().get_current_address().await];
        tokio::spawn(async move { Peers::read().await.broadcast_accounts_changed(addresses) });
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
