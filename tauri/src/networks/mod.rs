mod error;
mod global;
mod network;

use std::{collections::HashMap, path::PathBuf};

pub use error::{Error, Result};
use ethers::providers::{Http, Provider};
use serde::{Deserialize, Serialize};

use self::network::Network;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Networks {
    pub current: String,
    pub networks: HashMap<String, Network>,

    #[serde(skip)]
    file: Option<PathBuf>,
}

impl Networks {
    /// Changes the currently connected wallet
    ///
    /// Broadcasts `chainChanged`
    pub async fn set_current_network(&mut self, new_current_network: String) -> Result<()> {
        let previous_network = self.get_current_network();
        self.current = new_current_network;
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
            self.window_snd
                .as_ref()
                .unwrap()
                .send(app::Notify::NetworkChanged.into())?
        }

        self.save()?;

        Ok(())
    }

    pub async fn set_current_network_by_id(&mut self, new_chain_id: u32) -> Result<()> {
        let new_network = self
            .networks
            .values()
            .find(|n| n.chain_id == new_chain_id)
            .unwrap();

        self.set_current_network(new_network.name.clone())?;
        self.save()?;

        Ok(())
    }

    pub fn get_current_network(&self) -> &Network {
        &self.networks.get[&self.current]
    }

    pub fn set_networks(&mut self, networks: Vec<Network>) {
        self.networks = networks.into_iter().map(|n| (n.name.clone(), n)).collect();
        self.save().unwrap();
    }

    pub fn reset_networks(&mut self) {
        self.networks = Network::default();
        self.save().unwrap();
    }

    pub fn get_current_provider(&self) -> Provider<Http> {
        self.get_current_network().get_provider()
    }

    // broadcasts `accountsChanged` to all peers
    fn notify_peers(&self) {
        let current = self.get_current_network();
        tokio::spawn(async move {
            Peers::read()
                .await
                .broadcast_chain_chainged(current.chain_id, self.current)
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
