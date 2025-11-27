pub mod actor;
pub mod commands;
mod init;
mod migrations;

use ethui_types::prelude::*;
pub use init::init;
use migrations::LatestVersion;

pub use actor::{
    AddNetwork, ChainIdFromProvider, GetCurrent, GetList, GetLowestDedupId, GetNetwork,
    GetNetworkByDedupChainId, GetNetworkByName, IsDev, RemoveNetwork, SetCurrentByDedupChainId,
    SetCurrentById, SetCurrentByName, UpdateNetwork, ValidateChainId, ask, tell,
};

pub async fn get_network(chain_id: u32) -> Result<Network> {
    ask(GetNetwork(chain_id))
        .await?
        .ok_or_else(|| eyre!("Network with chain_id {} not found", chain_id))
}

pub async fn get_provider(chain_id: u32) -> Result<RootProvider<Ethereum>> {
    let network = get_network(chain_id).await?;
    network.get_alloy_provider().await
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SerializedNetworks {
    pub networks: HashMap<String, Network>,

    pub version: LatestVersion,

    pub current: String,
}
