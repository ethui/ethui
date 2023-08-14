pub mod commands;
mod error;
mod init;
mod network;

use std::{
    collections::{HashMap, HashSet},
    fs::File,
    path::{Path, PathBuf},
};

use ethers::providers::{Http, Provider};
pub use init::init;
use iron_types::UINotify;
use serde::{Deserialize, Serialize};

pub use self::{
    error::{Error, Result},
    network::Network,
};

#[derive(Debug, Clone, Serialize)]
pub struct Networks {
    pub networks: HashMap<String, Network>,

    // global affinity will point to the current network
    pub current: String,

    #[serde(skip)]
    file: PathBuf,
}

impl Networks {
    /// Changes the currently connected wallet by network name
    ///
    /// Broadcasts `chainChanged` to all connections with global or no affinity
    pub async fn set_current_by_name(&mut self, new_current_network: String) -> Result<()> {
        let previous = self.get_current().chain_id;
        self.current = new_current_network;
        let new = self.get_current().chain_id;

        if previous != new {
            self.on_network_changed().await?;
        }

        self.save()?;

        Ok(())
    }

    /// Changes the currently connected wallet by chain ID
    ///
    /// Broadcasts `chainChanged` to all connections with global or no affinity
    pub async fn set_current_by_id(&mut self, new_chain_id: u32) -> Result<()> {
        let new_network = self
            .networks
            .values()
            .find(|n| n.chain_id == new_chain_id)
            .unwrap();

        self.set_current_by_name(new_network.name.clone()).await?;
        self.save()?;

        Ok(())
    }

    pub fn get_current(&self) -> &Network {
        if !self.networks.contains_key(&self.current) {
            return self.networks.values().next().unwrap();
        }

        &self.networks[&self.current]
    }

    pub fn get_network(&self, chain_id: u32) -> Option<Network> {
        self.networks
            .values()
            .find(|n| n.chain_id == chain_id)
            .cloned()
    }

    pub async fn set_networks(&mut self, networks: Vec<Network>) -> Result<()> {
        self.do_set_networks(networks).await
    }

    pub async fn reset_networks(&mut self) -> Result<()> {
        self.do_set_networks(Network::all_default()).await
    }

    pub fn get_current_provider(&self) -> Provider<Http> {
        self.get_current().get_provider()
    }

    async fn on_network_changed(&self) -> Result<()> {
        // TODO: check domain
        self.notify_peers();
        iron_broadcast::ui_notify(UINotify::NetworkChanged).await;

        let chain_id = self.get_current().chain_id;
        iron_broadcast::current_network_changed(chain_id).await;

        Ok(())
    }

    async fn do_set_networks(&mut self, networks: Vec<Network>) -> Result<()> {
        let first = networks[0].name.clone();

        // update networks, keeping track of chain_ids before and after
        let before: HashSet<_> = self.current_chain_ids();
        self.networks = networks.into_iter().map(|n| (n.name.clone(), n)).collect();
        let after: HashSet<_> = self.current_chain_ids();

        tokio::spawn(async move {
            for c in after.difference(&before) {
                iron_broadcast::network_added(*c).await;
            }
            for c in before.difference(&after) {
                iron_broadcast::network_removed(*c).await;
            }
        });

        // TODO: check affinities

        if !self.networks.contains_key(&self.current) {
            self.current = first;
            self.on_network_changed().await?;
        }

        self.save()
    }

    // broadcasts `accountsChanged` to all peers
    fn notify_peers(&self) {
        let current = self.get_current().clone();
        tokio::spawn(async move {
            iron_broadcast::chain_changed(current.chain_id, current.name.clone()).await;
        });
    }

    async fn broadcast_init(&self) {
        for network in self.networks.values() {
            iron_broadcast::network_added(network.chain_id).await;
        }

        let chain_id = self.get_current().chain_id;
        iron_broadcast::current_network_changed(chain_id).await;
    }

    async fn reset_listeners(&mut self) {
        for network in self.networks.values_mut() {
            network.reset_listener().await.unwrap();
        }
    }

    fn current_chain_ids(&self) -> HashSet<u32> {
        self.networks.values().map(|n| n.chain_id).collect()
    }

    // Persists current state to disk
    fn save(&self) -> Result<()> {
        let pathbuf = self.file.clone();
        let path = Path::new(&pathbuf);
        let file = File::create(path)?;

        serde_json::to_writer_pretty(file, self)?;

        Ok(())
    }
}

/// Affinity of a connecction with a network
/// Each connection may either follow the global "current network", or stick to a specific chain_id
#[derive(Debug, Default, Clone, Serialize, Deserialize)]
pub enum Affinity {
    /// While on Global, peers will automatically be switched whenever the main connection
    /// switches, or whenever another global peer asks for a chain change
    #[default]
    Global,

    /// Sticky will only switch chain id when requested by itself
    Sticky(u32),
}

impl From<u32> for Affinity {
    fn from(value: u32) -> Self {
        Affinity::Sticky(value)
    }
}
