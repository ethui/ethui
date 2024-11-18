pub mod commands;
mod error;
mod init;
mod network;

use std::{
    collections::HashMap,
    fs::File,
    path::{Path, PathBuf},
};

use alloy::{
    providers::RootProvider,
    transports::{
        http::{Client, Http},
        layers::RetryBackoffService,
    },
};
use ethui_types::{Affinity, UINotify};
pub use init::init;
use serde::Serialize;

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

    pub fn validate_chain_id(&self, chain_id: u32) -> bool {
        self.networks.iter().any(|(_, n)| n.chain_id == chain_id)
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

    pub async fn add_network(&mut self, network: Network) -> Result<()> {
        // TODO: need to ensure uniqueness by name, not chain id
        if self.validate_chain_id(network.chain_id) {
            return Ok(());
        }

        if self.networks.contains_key(&network.name) {
            return Err(Error::AlreadyExists);
        }

        self.networks.insert(network.name.clone(), network.clone());
        self.save()?;
        ethui_broadcast::network_added(network.chain_id).await;
        ethui_broadcast::ui_notify(UINotify::NetworksChanged).await;

        Ok(())
    }

    pub async fn update_network(&mut self, old_name: &str, network: Network) -> Result<()> {
        self.networks.remove(old_name);
        self.networks.insert(network.name.clone(), network.clone());

        if self.current == old_name {
            self.current = network.name.clone();
            self.on_network_changed().await?;
        }

        self.save()?;
        ethui_broadcast::network_updated(network.chain_id).await;
        ethui_broadcast::ui_notify(UINotify::NetworksChanged).await;
        Ok(())
    }

    pub async fn remove_network(&mut self, name: &str) -> Result<()> {
        let network = self.networks.remove(name);

        match network {
            Some(network) => {
                if self.current == name {
                    let first = self.networks.values().next().unwrap();
                    self.current = first.name.clone();
                    self.on_network_changed().await?;
                }
                self.save()?;
                ethui_broadcast::network_removed(network.chain_id).await;
                ethui_broadcast::ui_notify(UINotify::NetworksChanged).await;
            }
            None => {
                return Err(Error::NotExists);
            }
        }
        Ok(())
    }

    pub fn get_current_provider(&self) -> RootProvider<RetryBackoffService<Http<Client>>> {
        self.get_current().get_provider()
    }

    async fn on_network_changed(&self) -> Result<()> {
        // TODO: check domain
        self.notify_peers();
        ethui_broadcast::ui_notify(UINotify::CurrentNetworkChanged).await;

        let chain_id = self.get_current().chain_id;
        ethui_broadcast::current_network_changed(chain_id).await;

        Ok(())
    }

    // broadcasts `accountsChanged` to all peers
    fn notify_peers(&self) {
        let current = self.get_current().clone();
        tokio::spawn(async move {
            ethui_broadcast::chain_changed(current.chain_id, None, Affinity::Global).await;
        });
    }

    async fn broadcast_init(&self) {
        for network in self.networks.values() {
            ethui_broadcast::network_added(network.chain_id).await;
        }

        let chain_id = self.get_current().chain_id;
        ethui_broadcast::current_network_changed(chain_id).await;
    }

    async fn reset_listeners(&mut self) {
        for network in self.networks.values_mut() {
            network.reset_listener().await.unwrap();
        }
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
