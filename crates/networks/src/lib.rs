pub mod actor;
pub mod commands;
mod init;
mod migrations;

pub use actor::{NetworksActorExt, networks, try_networks};
use ethui_types::prelude::*;
pub use init::init;
use migrations::LatestVersion;

pub async fn get_network(chain_id: u64) -> Result<Network> {
    networks()
        .get(chain_id)
        .await?
        .with_context(|| format!("Network with chain_id {} not found", chain_id))
}

/// Get a provider for a network by chain_id.
/// Acquires and releases the lock, then creates the provider.
pub async fn get_provider(chain_id: u64) -> Result<RootProvider<Ethereum>> {
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
