use std::path::PathBuf;

use ethui_types::prelude::*;
use kameo::actor::ActorRef;

use super::{RuntimeStateResponse, StacksActor};

#[allow(async_fn_in_trait)]
pub trait StacksActorExt {
    async fn get_config(&self) -> Result<(u16, PathBuf)>;
    async fn get_runtime_state(&self) -> Result<RuntimeStateResponse>;
    async fn list_stacks(&self) -> Result<Vec<String>>;
    async fn create_stack(&self, slug: String) -> Result<()>;
    async fn remove_stack(&self, slug: String) -> Result<()>;
    async fn shutdown(&self) -> Result<()>;
    async fn set_enabled(&self, enabled: bool) -> Result<()>;
    async fn initialize(&self) -> Result<()>;
}

impl StacksActorExt for ActorRef<StacksActor> {
    async fn get_config(&self) -> Result<(u16, PathBuf)> {
        Ok(self.ask(super::GetConfig).await?)
    }

    async fn get_runtime_state(&self) -> Result<RuntimeStateResponse> {
        Ok(self.ask(super::GetRuntimeState).await?)
    }

    async fn list_stacks(&self) -> Result<Vec<String>> {
        Ok(self.ask(super::ListStacks).await?)
    }

    async fn create_stack(&self, slug: String) -> Result<()> {
        self.ask(super::CreateStack { slug }).await?;
        Ok(())
    }

    async fn remove_stack(&self, slug: String) -> Result<()> {
        self.ask(super::RemoveStack { slug }).await?;
        Ok(())
    }

    async fn shutdown(&self) -> Result<()> {
        self.ask(super::Shutdown).await?;
        Ok(())
    }

    async fn set_enabled(&self, enabled: bool) -> Result<()> {
        self.tell(super::SetEnabled { enabled }).await?;
        Ok(())
    }

    async fn initialize(&self) -> Result<()> {
        self.ask(super::Initializing).await?;
        Ok(())
    }
}
