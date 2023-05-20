use std::collections::HashMap;
use std::fs::File;
use std::io::BufReader;
use std::net::SocketAddr;
use std::path::Path;

use ethers::providers::{Http, Provider};
use ethers_core::k256::ecdsa::SigningKey;
use serde::{Deserialize, Serialize};
use tokio::sync::mpsc;

pub use super::network::Network;
pub use super::wallet::Wallet;
use crate::app::{self, SETTINGS_PATH};
use crate::db::DB;
use crate::error::Result;
use crate::peers::Peers;
use crate::types::GlobalState;
use crate::ws::Peer;

#[derive(Debug, Deserialize, Serialize)]
pub struct ContextInner {
    pub wallet: Wallet,
    pub current_network: String,
    pub networks: HashMap<String, Network>,

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
            networks: Network::default(),
            current_network: String::from("mainnet"),
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

        for network in self.networks.values_mut() {
            network.reset_listener(&self.db, self.window_snd.as_ref().unwrap().clone())?;
        }

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

    /// Changes the currently connected wallet
    ///
    /// Broadcasts `chainChanged`
    pub fn set_current_network(&mut self, new_current_network: String) -> Result<()> {
        let previous_network = self.get_current_network();
        self.current_network = new_current_network;
        let new_network = self.get_current_network();

        if previous_network.chain_id != new_network.chain_id {
            // update signer
            self.wallet.update_chain_id(new_network.chain_id);

            // broadcast to peers
            tokio::spawn(async move {
                Peers::read()
                    .await
                    .broadcast_chain_changed(new_network.chain_id, new_network.name);
            });
            self.window_snd
                .as_ref()
                .unwrap()
                .send(app::Notify::NetworkChanged.into())?
        }

        self.save()?;

        Ok(())
    }

    pub fn set_current_network_by_id(&mut self, new_chain_id: u32) -> Result<()> {
        let new_network = self
            .networks
            .values()
            .find(|n| n.chain_id == new_chain_id)
            .unwrap();

        self.set_current_network(new_network.name.clone())?;
        self.save()?;

        Ok(())
    }

    pub fn set_networks(&mut self, networks: Vec<Network>) {
        self.networks = networks.into_iter().map(|n| (n.name.clone(), n)).collect();
        self.save().unwrap();
    }

    pub fn reset_networks(&mut self) {
        self.networks = Network::default();
        self.save().unwrap();
    }

    pub fn get_current_network(&self) -> Network {
        self.networks.get(&self.current_network).unwrap().clone()
    }

    pub fn get_provider(&self) -> Provider<Http> {
        let network = self.get_current_network();
        Provider::<Http>::try_from(network.http_url).unwrap()
    }

    pub fn get_signer(&self) -> ethers::signers::Wallet<SigningKey> {
        self.wallet.signer.clone()
    }
}
