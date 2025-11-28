use ethui_types::{Network, NetworkId, NewNetworkParams, prelude::*};
use kameo::actor::ActorRef;

use super::{
    Add, Get, GetByDedupChainId, GetByName, GetCurrent, GetList, GetLowestDedupId, NetworksActor,
    Remove, SetCurrentByDedupChainId, SetCurrentByName, Update, UpdateStatuses, ValidateChainId,
};

#[allow(async_fn_in_trait)]
pub trait NetworksActorExt {
    // Read operations
    async fn get_current(&self) -> Result<Network>;
    async fn get_list(&self) -> Result<Vec<Network>>;
    async fn get(&self, chain_id: u32) -> Result<Option<Network>>;
    async fn get_by_name(&self, name: String) -> Result<Option<Network>>;
    async fn get_by_dedup_chain_id(&self, dedup_chain_id: NetworkId) -> Result<Option<Network>>;
    async fn validate_chain_id(&self, chain_id: u32) -> Result<bool>;
    async fn get_lowest_dedup_id(&self, chain_id: u32) -> Result<u32>;

    // Write operations
    async fn set_current_by_name(&self, new_current_network: String) -> Result<()>;
    async fn set_current_by_dedup_chain_id(&self, dedup_chain_id: NetworkId) -> Result<()>;
    async fn add(&self, network: NewNetworkParams) -> Result<()>;
    async fn update(&self, old_name: String, network: Network) -> Result<()>;
    async fn remove(&self, name: String) -> Result<()>;
    async fn update_statuses(&self, updates: Vec<(String, Network)>) -> Result<()>;
}

impl NetworksActorExt for ActorRef<NetworksActor> {
    async fn get_current(&self) -> Result<Network> {
        Ok(self.ask(GetCurrent).await?)
    }

    async fn get_list(&self) -> Result<Vec<Network>> {
        Ok(self.ask(GetList).await?)
    }

    async fn get(&self, chain_id: u32) -> Result<Option<Network>> {
        Ok(self.ask(Get { chain_id }).await?)
    }

    async fn get_by_name(&self, name: String) -> Result<Option<Network>> {
        Ok(self.ask(GetByName { name }).await?)
    }

    async fn get_by_dedup_chain_id(&self, dedup_chain_id: NetworkId) -> Result<Option<Network>> {
        Ok(self.ask(GetByDedupChainId { dedup_chain_id }).await?)
    }

    async fn validate_chain_id(&self, chain_id: u32) -> Result<bool> {
        Ok(self.ask(ValidateChainId { chain_id }).await?)
    }

    async fn get_lowest_dedup_id(&self, chain_id: u32) -> Result<u32> {
        Ok(self.ask(GetLowestDedupId { chain_id }).await?)
    }

    async fn set_current_by_name(&self, new_current_network: String) -> Result<()> {
        Ok(self
            .tell(SetCurrentByName { new_current_network })
            .await?)
    }

    async fn set_current_by_dedup_chain_id(&self, dedup_chain_id: NetworkId) -> Result<()> {
        Ok(self
            .tell(SetCurrentByDedupChainId { dedup_chain_id })
            .await?)
    }

    async fn add(&self, network: NewNetworkParams) -> Result<()> {
        Ok(self.tell(Add { network }).await?)
    }

    async fn update(&self, old_name: String, network: Network) -> Result<()> {
        Ok(self.tell(Update { old_name, network }).await?)
    }

    async fn remove(&self, name: String) -> Result<()> {
        Ok(self.tell(Remove { name }).await?)
    }

    async fn update_statuses(&self, updates: Vec<(String, Network)>) -> Result<()> {
        Ok(self.tell(UpdateStatuses { updates }).await?)
    }
}
