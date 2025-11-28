use std::path::PathBuf;

use ethui_types::prelude::*;
use kameo::actor::ActorRef;

use crate::abi::ForgeAbi;

use super::ForgeActor;

#[allow(async_fn_in_trait)]
pub trait ForgeActorExt {
    async fn fetch_abis(&self) -> Result<Vec<ForgeAbi>>;
    async fn get_abi_for(&self, bytes: Bytes) -> Result<Option<ForgeAbi>>;
    async fn update_roots(&self, roots: Vec<PathBuf>) -> Result<()>;
    async fn poll_foundry_roots(&self) -> Result<()>;
    async fn new_contract(&self) -> Result<()>;
    async fn update_contracts(&self) -> Result<()>;
}

impl ForgeActorExt for ActorRef<ForgeActor> {
    async fn fetch_abis(&self) -> Result<Vec<ForgeAbi>> {
        Ok(self.ask(super::FetchAbis).await?)
    }

    async fn get_abi_for(&self, bytes: Bytes) -> Result<Option<ForgeAbi>> {
        Ok(self.ask(super::GetAbiFor { bytes }).await?)
    }

    async fn update_roots(&self, roots: Vec<PathBuf>) -> Result<()> {
        self.tell(super::UpdateRoots { roots }).await?;
        Ok(())
    }

    async fn poll_foundry_roots(&self) -> Result<()> {
        self.tell(super::PollFoundryRoots).await?;
        Ok(())
    }

    async fn new_contract(&self) -> Result<()> {
        self.tell(super::NewContract).await?;
        Ok(())
    }

    async fn update_contracts(&self) -> Result<()> {
        self.ask(super::UpdateContracts).await?;
        Ok(())
    }
}
