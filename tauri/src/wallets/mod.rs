pub mod commands;
mod error;
mod global;
mod wallet;

use std::{
    fs::File,
    path::{Path, PathBuf},
};

use ethers_core::k256::ecdsa::SigningKey;
use serde::{Deserialize, Serialize};

pub use self::{
    error::{Error, Result},
    wallet::Wallet,
};
use crate::{peers::Peers, types::GlobalState};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Wallets {
    pub wallet: Wallet,

    #[serde(skip)]
    file: Option<PathBuf>,
}

impl Wallets {
    /// Changes the currently connected wallet
    ///
    /// Broadcasts `accountsChanged`
    pub fn set_wallet(&mut self, wallet: Wallet) {
        self.wallet = wallet;

        self.notify_peers();
        self.save().unwrap();
    }

    pub fn get_signer(&self) -> ethers::signers::Wallet<SigningKey> {
        self.wallet.signer.clone()
    }

    // broadcasts `accountsChanged` to all peers
    fn notify_peers(&self) {
        let new_addresses = vec![self.wallet.get_current_address()];
        tokio::spawn(async move {
            Peers::read()
                .await
                .broadcast_accounts_changed(new_addresses)
        });
    }

    // Persists current state to disk
    fn save(&self) -> Result<()> {
        let pathbuf = self.file.clone().unwrap();
        let path = Path::new(&pathbuf);
        let file = File::create(path)?;

        serde_json::to_writer_pretty(file, self)?;

        Ok(())
    }
}
