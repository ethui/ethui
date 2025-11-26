pub mod commands;
mod init;
mod migrations;

use std::{fs::File, path::PathBuf};

use ethui_types::{Affinity, NetworkId, NewNetworkParams, prelude::*};
pub use init::init;
use migrations::LatestVersion;

pub async fn get_network(chain_id: u32) -> Result<Network> {
    Networks::read().await.get_network_cloned(chain_id)
}

pub async fn get_provider(chain_id: u32) -> Result<RootProvider<Ethereum>> {
    let network = get_network(chain_id).await?;
    network.get_alloy_provider().await
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SerializedNetworks {
    pub networks: HashMap<String, Network>,

    pub version: LatestVersion,

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
        let previous = self.get_current().name.clone();
        self.inner.current = new_current_network;
        let new = self.get_current().name.clone();

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
            .find(|n| n.chain_id() == new_chain_id)
            .wrap_err_with(|| format!("Network with chain_id {new_chain_id} not found"))?;

        self.set_current_by_name(new_network.name.clone()).await?;
        self.save()?;

        Ok(())
    }

    /// Changes the currently connected wallet by internal ID
    ///
    /// Broadcasts `chainChanged` to all connections with global or no affinity
    pub async fn set_current_by_dedup_chain_id(&mut self, dedup_chain_id: NetworkId) -> Result<()> {
        let new_network = self
            .inner
            .networks
            .values()
            .find(|n| n.dedup_chain_id() == dedup_chain_id)
            .wrap_err_with(|| {
                format!("Network with dedup_chain_id {dedup_chain_id:?} not found")
            })?;

        self.set_current_by_name(new_network.name.clone()).await?;
        self.save()?;

        Ok(())
    }

    pub fn validate_chain_id(&self, chain_id: u32) -> bool {
        self.inner
            .networks
            .iter()
            .any(|(_, n)| n.chain_id() == chain_id)
    }

    pub fn get_current(&self) -> &Network {
        if !self.inner.networks.contains_key(&self.inner.current) {
            return self
                .inner
                .networks
                .values()
                .next()
                .expect("No networks available");
        }

        &self.inner.networks[&self.inner.current]
    }

    pub fn get_network(&self, chain_id: u32) -> Option<&Network> {
        self.inner
            .networks
            .values()
            .find(|n| n.chain_id() == chain_id)
    }

    pub fn get_network_by_name(&self, name: &str) -> Option<&Network> {
        self.inner.networks.values().find(|n| n.name == name)
    }

    pub fn get_network_by_dedup_chain_id(&self, dedup_chain_id: NetworkId) -> Option<&Network> {
        self.inner
            .networks
            .values()
            .find(|n| n.id == dedup_chain_id)
    }

    pub fn get_network_cloned(&self, chain_id: u32) -> Result<Network> {
        self.get_network(chain_id)
            .cloned()
            .ok_or_else(|| eyre!("Network with chain_id {} not found", chain_id))
    }

    pub fn get_network_by_dedup_chain_id_cloned(
        &self,
        dedup_chain_id: NetworkId,
    ) -> Result<Network> {
        self.get_network_by_dedup_chain_id(dedup_chain_id)
            .cloned()
            .ok_or_else(|| eyre!("Network with dedup_chain_id {:?} not found", dedup_chain_id))
    }

    pub async fn add_network(&mut self, network: NewNetworkParams) -> Result<()> {
        if self.inner.networks.contains_key(&network.name) {
            return Err(eyre!("Already exists"));
        }

        let deduplication_id = self.get_chain_id_count(network.chain_id) as u32;
        let network = network.into_network(deduplication_id);

        if !network.is_dev().await
            & self
                .get_network_by_dedup_chain_id(network.dedup_chain_id())
                .is_some()
        {
            return Err(eyre!("Already exists"));
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
            return Err(eyre!("Already exists"));
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
                    let first = self
                        .inner
                        .networks
                        .values()
                        .next()
                        .wrap_err_with(|| "No networks remaining")?;
                    self.inner.current = first.name.clone();
                    self.on_network_changed().await?;
                }
                self.save()?;
                ethui_broadcast::network_removed(network).await;
                ethui_broadcast::ui_notify(UINotify::NetworksChanged).await;
            }
            None => {
                return Err(eyre!("Does not exist"));
            }
        }
        Ok(())
    }

    pub fn get_current_provider(&self) -> RootProvider<Ethereum> {
        self.get_current().get_provider()
    }

    pub fn get_chain_id_count(&self, chain_id: u32) -> usize {
        self.inner
            .networks
            .values()
            .filter(|network| network.chain_id() == chain_id)
            .count()
    }

    pub fn get_lowest_dedup_id(&self, chain_id: u32) -> u32 {
        self.inner
            .networks
            .values()
            .filter(|network| network.chain_id() == chain_id)
            .map(|network| network.id.dedup_id())
            .min()
            .unwrap_or(0)
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
            ethui_broadcast::chain_changed(current.dedup_chain_id(), None, Affinity::Global).await;
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
        let file = File::create(&self.file)?;

        serde_json::to_writer_pretty(file, &self.inner)?;

        Ok(())
    }
}
