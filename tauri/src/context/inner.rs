use std::fs::File;
use std::io::BufReader;
use std::path::Path;

use ethers_core::k256::ecdsa::SigningKey;
use serde::{Deserialize, Serialize};
use tokio::sync::mpsc;

pub use super::wallet::Wallet;
use crate::{
    app::{self, SETTINGS_PATH},
    error::Result,
    peers::Peers,
    types::GlobalState,
};

#[derive(Debug, Deserialize, Serialize, Default)]
pub struct ContextInner {
    pub wallet: Wallet,

    #[serde(skip)]
    window_snd: Option<mpsc::UnboundedSender<app::Event>>,
}

impl ContextInner {
    pub async fn from_settings_file() -> Result<Self> {
        let path = Path::new(SETTINGS_PATH.get().unwrap());

        let res: Self = if path.exists() {
            let file = File::open(path)?;
            let reader = BufReader::new(file);

            serde_json::from_reader(reader)?
        } else {
            let defaults: Self = Default::default();
            defaults.save()?;
            defaults
        };

        Ok(res)
    }

    pub async fn init(&mut self, sender: mpsc::UnboundedSender<app::Event>) -> Result<()> {
        self.window_snd = Some(sender);

        Ok(())
    }

    pub fn save(&self) -> Result<()> {
        let path = Path::new(SETTINGS_PATH.get().unwrap());
        let file = File::create(path)?;

        serde_json::to_writer_pretty(file, self)?;

        Ok(())
    }

    /// Changes the currently connected wallet
    ///
    /// Broadcasts `accountsChanged`
    pub fn set_wallet(&mut self, wallet: Wallet) {
        self.wallet = wallet;
        let new_addresses = vec![self.wallet.get_current_address()];

        tokio::spawn(async move {
            Peers::read()
                .await
                .broadcast_accounts_changed(new_addresses)
        });
        self.save().unwrap();
    }

    pub fn get_signer(&self) -> ethers::signers::Wallet<SigningKey> {
        self.wallet.signer.clone()
    }
}
