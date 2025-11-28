use std::path::PathBuf;

use kameo::actor::ActorRef;

use super::{
    CreateStack, GetConfig, GetRuntimeState, Initializing, ListStacks, RemoveStack,
    RuntimeStateResponse, SetEnabled, Shutdown, StacksActor,
};

#[allow(async_fn_in_trait)]
pub trait StacksActorExt {
    async fn get_config(&self) -> color_eyre::Result<(u16, PathBuf)>;
    async fn get_runtime_state(&self) -> color_eyre::Result<RuntimeStateResponse>;
    async fn list_stacks(&self) -> color_eyre::Result<Vec<String>>;
    async fn create_stack(&self, slug: String) -> color_eyre::Result<()>;
    async fn remove_stack(&self, slug: String) -> color_eyre::Result<()>;
    async fn shutdown(&self) -> color_eyre::Result<()>;
    async fn set_enabled(&self, enabled: bool) -> color_eyre::Result<()>;
    async fn initialize(&self) -> color_eyre::Result<()>;
}

impl StacksActorExt for ActorRef<StacksActor> {
    async fn get_config(&self) -> color_eyre::Result<(u16, PathBuf)> {
        Ok(self.ask(GetConfig).await?)
    }

    async fn get_runtime_state(&self) -> color_eyre::Result<RuntimeStateResponse> {
        Ok(self.ask(GetRuntimeState).await?)
    }

    async fn list_stacks(&self) -> color_eyre::Result<Vec<String>> {
        Ok(self.ask(ListStacks).await?)
    }

    async fn create_stack(&self, slug: String) -> color_eyre::Result<()> {
        self.ask(CreateStack(slug)).await?;
        Ok(())
    }

    async fn remove_stack(&self, slug: String) -> color_eyre::Result<()> {
        self.ask(RemoveStack(slug)).await?;
        Ok(())
    }

    async fn shutdown(&self) -> color_eyre::Result<()> {
        self.ask(Shutdown).await?;
        Ok(())
    }

    async fn set_enabled(&self, enabled: bool) -> color_eyre::Result<()> {
        self.tell(SetEnabled(enabled)).await?;
        Ok(())
    }

    async fn initialize(&self) -> color_eyre::Result<()> {
        self.ask(Initializing).await?;
        Ok(())
    }
}
