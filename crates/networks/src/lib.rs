pub mod commands;
mod error;
mod init;

use std::{
    collections::HashMap,
    fs::File,
    path::{Path, PathBuf},
};

use alloy::{
    network::Ethereum,
    providers::{Provider, ProviderBuilder, RootProvider},
};
use ethui_types::{Affinity, Network, UINotify};
pub use init::init;
use serde::Serialize;

pub use self::error::{Error, Result};

#[derive(Debug, Clone, Serialize)]
pub struct SerializedNetworks {
    pub networks: HashMap<String, Network>,

    // global affinity will point to the current network
    pub current: String,
}

#[derive(Debug, Clone)]
pub struct Networks {
    pub inner: SerializedNetworks,

    file: PathBuf,
}

impl Networks {
    /// Changes the currently connected wallet by network name
    ///
    /// Broadcasts `chainChanged` to all connections with global or no affinity
    pub async fn set_current_by_name(&mut self, new_current_network: String) -> Result<()> {
        let previous = self.get_current().chain_id;
        self.inner.current = new_current_network;
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
            .inner
            .networks
            .values()
            .find(|n| n.chain_id == new_chain_id)
            .unwrap();

        self.set_current_by_name(new_network.name.clone()).await?;
        self.save()?;

        Ok(())
    }

    pub fn validate_chain_id(&self, chain_id: u32) -> bool {
        self.inner
            .networks
            .iter()
            .any(|(_, n)| n.chain_id == chain_id)
    }

    pub fn get_current(&self) -> &Network {
        if !self.inner.networks.contains_key(&self.inner.current) {
            return self.inner.networks.values().next().unwrap();
        }

        &self.inner.networks[&self.inner.current]
    }

    pub fn get_network(&self, chain_id: u32) -> Option<Network> {
        self.inner
            .networks
            .values()
            .find(|n| n.chain_id == chain_id)
            .cloned()
    }

    pub async fn add_network(&mut self, network: Network) -> Result<()> {
        // TODO: need to ensure uniqueness by name, not chain id
        if self.validate_chain_id(network.chain_id) {
            return Err(Error::AlreadyExists);
        }

        if self.inner.networks.contains_key(&network.name) {
            return Err(Error::AlreadyExists);
        }

        self.inner
            .networks
            .insert(network.name.clone(), network.clone());
        self.save()?;
        ethui_broadcast::network_added(network.clone()).await;
        ethui_broadcast::ui_notify(UINotify::NetworksChanged).await;

        Ok(())
    }

    pub async fn update_network(&mut self, old_name: &str, network: Network) -> Result<()> {
        if network.name != old_name && self.inner.networks.contains_key(&network.name) {
            return Err(Error::AlreadyExists);
        }

        self.inner.networks.remove(old_name);
        self.inner
            .networks
            .insert(network.clone().name.clone(), network.clone());

        if self.inner.current == old_name {
            self.inner.current = network.name.clone();
            self.on_network_changed().await?;
        }

        self.save()?;
        ethui_broadcast::network_updated(network.clone()).await;
        ethui_broadcast::ui_notify(UINotify::NetworksChanged).await;

        Ok(())
    }

    pub async fn remove_network(&mut self, name: &str) -> Result<()> {
        let network = self.inner.networks.remove(name);

        match network {
            Some(network) => {
                if self.inner.current == name {
                    let first = self.inner.networks.values().next().unwrap();
                    self.inner.current = first.name.clone();
                    self.on_network_changed().await?;
                }
                self.save()?;
                ethui_broadcast::network_removed(network).await;
                ethui_broadcast::ui_notify(UINotify::NetworksChanged).await;
            }
            None => {
                return Err(Error::NotExists);
            }
        }
        Ok(())
    }

    pub fn get_current_provider(&self) -> RootProvider<Ethereum> {
        self.get_current().get_provider()
    }

    pub async fn chain_id_from_provider(&self, url: String) -> Result<u64> {
        let provider = ProviderBuilder::new()
            .disable_recommended_fillers()
            .on_builtin(&url)
            .await?;

        Ok(provider.get_chain_id().await?)
    }

    async fn on_network_changed(&self) -> Result<()> {
        // TODO: check domain
        self.notify_peers();
        ethui_broadcast::ui_notify(UINotify::CurrentNetworkChanged).await;

        let network = self.get_current().clone();
        ethui_broadcast::current_network_changed(network).await;

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
        for network in self.inner.networks.values() {
            ethui_broadcast::network_added(network.clone()).await;
        }

        let network = self.get_current().clone();
        ethui_broadcast::current_network_changed(network).await;
    }

    // Persists current state to disk
    fn save(&self) -> Result<()> {
        let pathbuf = self.file.clone();
        let path = Path::new(&pathbuf);
        let file = File::create(path)?;

        serde_json::to_writer_pretty(file, &self.inner)?;

        Ok(())
    }
}
