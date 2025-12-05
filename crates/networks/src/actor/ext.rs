use ethui_types::{Network, NewNetworkParams, prelude::*};
use kameo::actor::ActorRef;

use super::{
    Add, Get, GetCurrent, GetList, GetLowestDedupId, NetworksActor, Remove, SetCurrent, Update,
    UpdateStatuses, ValidateChainId,
};
use crate::actor::types::NetworkGetKey;

#[allow(async_fn_in_trait)]
pub trait NetworksActorExt {
    // Read operations
    async fn get_current(&self) -> Result<Network>;
    async fn get_list(&self) -> Result<Vec<Network>>;
<<<<<<< HEAD
    async fn get(&self, id_or_name: impl Into<NetworkGetKey>) -> Result<Option<Network>>;
    async fn validate_chain_id(&self, chain_id: u32) -> Result<bool>;
    async fn get_lowest_dedup_id(&self, chain_id: u32) -> Result<u32>;
||||||| parent of 2cc58eeb (refactor: use u64 for chain ids, consistent with alloy (#1514))
    async fn get(&self, chain_id: u32) -> Result<Option<Network>>;
    async fn get_by_name(&self, name: String) -> Result<Option<Network>>;
    async fn get_by_id(&self, id: NetworkId) -> Result<Option<Network>>;
    async fn validate_chain_id(&self, chain_id: u32) -> Result<bool>;
    async fn get_lowest_dedup_id(&self, chain_id: u32) -> Result<u32>;
=======
    async fn get(&self, chain_id: u64) -> Result<Option<Network>>;
    async fn get_by_name(&self, name: String) -> Result<Option<Network>>;
    async fn get_by_id(&self, id: NetworkId) -> Result<Option<Network>>;
    async fn validate_chain_id(&self, chain_id: u64) -> Result<bool>;
    async fn get_lowest_dedup_id(&self, chain_id: u64) -> Result<u64>;
>>>>>>> 2cc58eeb (refactor: use u64 for chain ids, consistent with alloy (#1514))

    // Write operations
    async fn set_current(&self, id_or_name: impl Into<NetworkGetKey>) -> Result<()>;
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

<<<<<<< HEAD
    async fn get(&self, key: impl Into<NetworkGetKey>) -> Result<Option<Network>> {
        Ok(self.ask(Get { key: key.into() }).await?)
||||||| parent of 2cc58eeb (refactor: use u64 for chain ids, consistent with alloy (#1514))
    async fn get(&self, chain_id: u32) -> Result<Option<Network>> {
        Ok(self.ask(Get { chain_id }).await?)
    }

    async fn get_by_name(&self, name: String) -> Result<Option<Network>> {
        Ok(self.ask(GetByName { name }).await?)
    }

    async fn get_by_id(&self, id: NetworkId) -> Result<Option<Network>> {
        Ok(self.ask(GetById { id }).await?)
=======
    async fn get(&self, chain_id: u64) -> Result<Option<Network>> {
        Ok(self.ask(Get { chain_id }).await?)
    }

    async fn get_by_name(&self, name: String) -> Result<Option<Network>> {
        Ok(self.ask(GetByName { name }).await?)
    }

    async fn get_by_id(&self, id: NetworkId) -> Result<Option<Network>> {
        Ok(self.ask(GetById { id }).await?)
>>>>>>> 2cc58eeb (refactor: use u64 for chain ids, consistent with alloy (#1514))
    }

    async fn validate_chain_id(&self, chain_id: u64) -> Result<bool> {
        Ok(self.ask(ValidateChainId { chain_id }).await?)
    }

    async fn get_lowest_dedup_id(&self, chain_id: u64) -> Result<u64> {
        Ok(self.ask(GetLowestDedupId { chain_id }).await?)
    }

    async fn set_current(&self, id_or_name: impl Into<NetworkGetKey>) -> Result<()> {
        Ok(self
            .tell(SetCurrent {
                id_or_name: id_or_name.into(),
            })
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
