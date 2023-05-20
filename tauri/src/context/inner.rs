use std::collections::HashMap;
use std::fs::File;
use std::io::BufReader;
use std::net::SocketAddr;
use std::path::Path;

use ethers::providers::{Http, Provider};
use ethers_core::k256::ecdsa::SigningKey;
use log::warn;
use serde::{Deserialize, Serialize};
use serde_json::json;
use tokio::sync::mpsc;

pub use super::wallet::Wallet;
use crate::app::{self, Notify, SETTINGS_PATH};
use crate::db::DB;
use crate::error::Result;
use crate::ws::Peer;

#[derive(Debug, Deserialize, Serialize)]
pub struct ContextInner {
    pub wallet: Wallet,

    /// Deserialized into an empty HashMap
    #[serde(skip)]
    pub peers: HashMap<SocketAddr, Peer>,

    /// This is deserialized with the Default trait which only works after `App` has been
    /// initialized and `DB_PATH` cell filled
    #[serde(skip)]
    pub db: DB,

    #[serde(skip)]
    window_snd: Option<mpsc::UnboundedSender<app::Event>>,
}

impl Default for ContextInner {
    fn default() -> Self {
        Self {
            wallet: Default::default(),
            peers: Default::default(),
            db: Default::default(),
            window_snd: None,
        }
    }
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
        self.db.connect().await?;

        // this needs to be called after initialization since the deserialized signer hardcoded
        // chain_id = 1
        self.wallet
            .update_chain_id(self.get_current_network().chain_id);

        Ok(())
    }

    pub fn save(&self) -> Result<()> {
        let path = Path::new(SETTINGS_PATH.get().unwrap());
        let file = File::create(path)?;

        serde_json::to_writer_pretty(file, self)?;

        Ok(())
    }

    pub fn add_peer(&mut self, peer: Peer) {
        self.peers.insert(peer.socket, peer);
        self.save().unwrap();
        self.window_snd
            .as_ref()
            .unwrap()
            .send(Notify::ConnectionsUpdated.into())
            .unwrap();
    }

    pub fn remove_peer(&mut self, peer: SocketAddr) {
        self.peers.remove(&peer);
        self.save().unwrap();
        self.window_snd
            .as_ref()
            .unwrap()
            .send(Notify::ConnectionsUpdated.into())
            .unwrap();
    }

    pub fn broadcast<T: Serialize + std::fmt::Debug>(&self, msg: T) {
        self.peers.iter().for_each(|(_, peer)| {
            peer.sender
                .send(serde_json::to_value(&msg).unwrap())
                .unwrap_or_else(|e| {
                    warn!("Failed to send message to peer: {}", e);
                });
        });
    }

    /// Changes the currently connected wallet
    ///
    /// Broadcasts `accountsChanged`
    pub fn set_wallet(&mut self, wallet: Wallet) {
        let previous_address = self.wallet.checksummed_address();
        self.wallet = wallet;
        let new_address = self.wallet.checksummed_address();

        if previous_address != new_address {
            self.broadcast(json!({
                "method": "accountsChanged",
                "params": [new_address]
            }));
        }
        self.save().unwrap();
    }

    pub fn get_signer(&self) -> ethers::signers::Wallet<SigningKey> {
        self.wallet.signer.clone()
    }
}
