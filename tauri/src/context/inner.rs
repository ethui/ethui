use std::collections::HashMap;
use std::net::SocketAddr;
use std::path::PathBuf;

use ethers::providers::{Http, Provider};
use ethers_core::k256::ecdsa::SigningKey;
use log::info;
use serde::{Deserialize, Serialize};
use serde_json::json;
use tokio::sync::mpsc;

pub use super::network::Network;
pub use super::wallet::Wallet;
use crate::error::Result;

#[derive(Debug, Default, Deserialize, Serialize)]
pub struct ContextInner {
    pub wallet: Wallet,
    pub current_network: String,
    pub networks: HashMap<String, Network>,
    #[serde(skip)]
    pub peers: HashMap<SocketAddr, mpsc::UnboundedSender<serde_json::Value>>,
    #[serde(skip)]
    pub db: Option<sled::Db>,
}

impl ContextInner {
    pub fn new() -> Self {
        let mut networks = HashMap::new();
        networks.insert(String::from("mainnet"), Network::mainnet());
        networks.insert(String::from("goerli"), Network::goerli());
        networks.insert(String::from("anvil"), Network::anvil());

        Self {
            wallet: Wallet::default(),
            current_network: String::from("mainnet"),
            networks,
            ..Default::default()
        }
    }

    pub fn connect_db(&mut self, path: PathBuf) -> Result<()> {
        self.db = Some(sled::open(path)?);
        Ok(())
    }

    pub fn add_peer(&mut self, peer: SocketAddr, snd: mpsc::UnboundedSender<serde_json::Value>) {
        self.peers.insert(peer, snd);
    }

    pub fn remove_peer(&mut self, peer: SocketAddr) {
        self.peers.remove(&peer);
    }

    pub fn broadcast<T: Serialize + std::fmt::Debug>(&self, msg: T) {
        info!("Broadcasting message: {:?}", msg);

        self.peers.iter().for_each(|(_, sender)| {
            sender.send(serde_json::to_value(&msg).unwrap()).unwrap();
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
    }

    /// Changes the currently connected wallet
    ///
    /// Broadcasts `chainChanged`
    pub fn set_current_network(&mut self, new_current_network: String) {
        let previous_network = self.get_current_network();
        self.current_network = new_current_network;
        let new_network = self.get_current_network();

        if previous_network.chain_id != new_network.chain_id {
            // update signer
            self.wallet.update_chain_id(new_network.chain_id);

            // broadcast to peers
            self.broadcast(json!({
                "method": "chainChanged",
                "params": {
                    "chainId": format!("0x{:x}", new_network.chain_id),
                    "networkVersion": new_network.name
                }
            }));
        }
    }

    pub fn set_current_network_by_id(&mut self, new_chain_id: u32) {
        let new_network = self
            .networks
            .values()
            .find(|n| n.chain_id == new_chain_id)
            .unwrap();

        self.set_current_network(new_network.name.clone())
    }

    pub fn set_networks(&mut self, networks: Vec<Network>) {
        self.networks = networks.into_iter().map(|n| (n.name.clone(), n)).collect();
    }

    pub fn get_current_network(&self) -> Network {
        self.networks.get(&self.current_network).unwrap().clone()
    }

    pub fn get_provider(&self) -> Provider<Http> {
        let network = self.get_current_network();
        Provider::<Http>::try_from(network.rpc_url).unwrap()
    }

    pub fn get_signer(&self) -> ethers::signers::Wallet<SigningKey> {
        self.wallet.signer.clone()
    }
}
