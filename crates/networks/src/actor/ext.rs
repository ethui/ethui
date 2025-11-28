use ethui_types::{Network, NetworkId, NewNetworkParams, prelude::*};
use kameo::actor::ActorRef;

use super::{
    AddNetwork, GetChainIdCount, GetCurrent, GetList, GetLowestDedupId, GetNetwork,
    GetNetworkByDedupChainId, GetNetworkByName, NetworksActor, RemoveNetwork,
    SetCurrentByDedupChainId, SetCurrentById, SetCurrentByName, UpdateNetwork,
    UpdateNetworkStatuses, ValidateChainId,
};

#[allow(async_fn_in_trait)]
pub trait NetworksActorExt {
    // Read operations
    async fn get_current(&self) -> Result<Network>;
    async fn get_list(&self) -> Result<Vec<Network>>;
    async fn get_network(&self, chain_id: u32) -> Result<Option<Network>>;
    async fn get_network_by_name(&self, name: String) -> Result<Option<Network>>;
    async fn get_network_by_dedup_chain_id(&self, id: NetworkId) -> Result<Option<Network>>;
    async fn validate_chain_id(&self, chain_id: u32) -> Result<bool>;
    async fn get_chain_id_count(&self, chain_id: u32) -> Result<usize>;
    async fn get_lowest_dedup_id(&self, chain_id: u32) -> Result<u32>;

    // Write operations
    async fn set_current_by_name(&self, name: String) -> Result<()>;
    async fn set_current_by_id(&self, chain_id: u32) -> Result<()>;
    async fn set_current_by_dedup_chain_id(&self, id: NetworkId) -> Result<()>;
    async fn add_network(&self, params: NewNetworkParams) -> Result<()>;
    async fn update_network(&self, old_name: String, network: Network) -> Result<()>;
    async fn remove_network(&self, name: String) -> Result<()>;
    async fn update_network_statuses(&self, updates: Vec<(String, Network)>) -> Result<()>;
}

impl NetworksActorExt for ActorRef<NetworksActor> {
    async fn get_current(&self) -> Result<Network> {
        Ok(self.ask(GetCurrent).await?)
    }

    async fn get_list(&self) -> Result<Vec<Network>> {
        Ok(self.ask(GetList).await?)
    }

    async fn get_network(&self, chain_id: u32) -> Result<Option<Network>> {
        Ok(self.ask(GetNetwork { chain_id }).await?)
    }

    async fn get_network_by_name(&self, name: String) -> Result<Option<Network>> {
        Ok(self.ask(GetNetworkByName { name }).await?)
    }

    async fn get_network_by_dedup_chain_id(&self, id: NetworkId) -> Result<Option<Network>> {
        Ok(self.ask(GetNetworkByDedupChainId { dedup_chain_id: id }).await?)
    }

    async fn validate_chain_id(&self, chain_id: u32) -> Result<bool> {
        Ok(self.ask(ValidateChainId { chain_id }).await?)
    }

    async fn get_chain_id_count(&self, chain_id: u32) -> Result<usize> {
        Ok(self.ask(GetChainIdCount { chain_id }).await?)
    }

    async fn get_lowest_dedup_id(&self, chain_id: u32) -> Result<u32> {
        Ok(self.ask(GetLowestDedupId { chain_id }).await?)
    }

    async fn set_current_by_name(&self, name: String) -> Result<()> {
        self.ask(SetCurrentByName {
            new_current_network: name,
        })
        .await?;
        Ok(())
    }

    async fn set_current_by_id(&self, chain_id: u32) -> Result<()> {
        self.ask(SetCurrentById {
            new_chain_id: chain_id,
        })
        .await?;
        Ok(())
    }

    async fn set_current_by_dedup_chain_id(&self, id: NetworkId) -> Result<()> {
        self.ask(SetCurrentByDedupChainId { dedup_chain_id: id })
            .await?;
        Ok(())
    }

    async fn add_network(&self, params: NewNetworkParams) -> Result<()> {
        self.ask(AddNetwork { network: params }).await?;
        Ok(())
    }

    async fn update_network(&self, old_name: String, network: Network) -> Result<()> {
        self.ask(UpdateNetwork { old_name, network }).await?;
        Ok(())
    }

    async fn remove_network(&self, name: String) -> Result<()> {
        self.ask(RemoveNetwork { name }).await?;
        Ok(())
    }

    async fn update_network_statuses(&self, updates: Vec<(String, Network)>) -> Result<()> {
        self.ask(UpdateNetworkStatuses { updates }).await?;
        Ok(())
    }
}
