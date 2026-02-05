use std::path::PathBuf;

use ethui_types::prelude::*;
use kameo::actor::ActorRef;

use super::SolArtifactsActor;
use crate::{abi::SolArtifact, project::Project};

#[allow(async_fn_in_trait)]
pub trait SolArtifactsActorExt {
    async fn fetch_abis(&self) -> Result<Vec<SolArtifact>>;
    async fn get_abi_for(&self, bytes: Bytes) -> Result<Option<SolArtifact>>;
    async fn update_roots(&self, roots: Vec<PathBuf>) -> Result<()>;
    async fn poll_projects(&self) -> Result<()>;
    async fn get_projects(&self) -> Result<Vec<Project>>;
    async fn new_contract(&self) -> Result<()>;
    async fn update_contracts(&self) -> Result<()>;
}

impl SolArtifactsActorExt for ActorRef<SolArtifactsActor> {
    async fn fetch_abis(&self) -> Result<Vec<SolArtifact>> {
        Ok(self.ask(super::FetchAbis).await?)
    }

    async fn get_abi_for(&self, bytes: Bytes) -> Result<Option<SolArtifact>> {
        Ok(self.ask(super::GetAbiFor { bytes }).await?)
    }

    async fn update_roots(&self, roots: Vec<PathBuf>) -> Result<()> {
        Ok(self.ask(super::UpdateRoots { roots }).await?)
    }

    async fn poll_projects(&self) -> Result<()> {
        self.tell(super::PollProjects).await?;
        Ok(())
    }

    async fn get_projects(&self) -> Result<Vec<Project>> {
        Ok(self.ask(super::GetProjects).await?)
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
