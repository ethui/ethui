use std::path::PathBuf;

use ethui_types::prelude::*;
use kameo::prelude::*;
use tracing::error;

use crate::docker::{
    ContainerNotRunning, ContainerRunning, DockerManager, DockerManagerState, start_stacks,
};

pub async fn ask<M>(msg: M) -> color_eyre::Result<<<Worker as Message<M>>::Reply as Reply>::Ok>
where
    Worker: Message<M>,
    M: Send + 'static + Sync,
    <<Worker as Message<M>>::Reply as Reply>::Error: Sync + std::fmt::Display,
{
    let actor = ActorRef::<Worker>::lookup("run_local_stacks")?
        .wrap_err_with(|| "local stacks actor not found")?;

    // The function now directly uses the global actor reference.
    actor.ask(msg).await.wrap_err_with(|| "failed")
}

pub async fn tell<M>(msg: M) -> color_eyre::Result<()>
where
    Worker: Message<M>,
    M: Send + 'static + Sync,
    <<Worker as Message<M>>::Reply as Reply>::Error: Sync + std::fmt::Display,
{
    let actor = ActorRef::<Worker>::lookup("run_local_stacks")?
        .wrap_err_with(|| "local stacks actor not found")?;

    actor.tell(msg).await.map_err(Into::into)
}

#[derive(Clone, Debug)]
pub struct Worker {
    pub stacks: bool,
    pub port: u16,
    pub config_dir: PathBuf,
    pub manager: RuntimeState,
}

#[derive(Clone, Debug)]
pub enum RuntimeState {
    Error,
    Stopped(DockerManager<ContainerNotRunning>),
    Running(DockerManager<ContainerRunning>),
}

pub struct SetEnabled(pub bool);
pub struct GetConfig();
pub struct ListStracks();
pub struct CreateStack(pub String);
pub struct RemoveStack(pub String);

impl Message<SetEnabled> for Worker {
    type Reply = ();

    async fn handle(
        &mut self,
        SetEnabled(enabled): SetEnabled,
        _ctx: &mut Context<Self, Self::Reply>,
    ) -> Self::Reply {
        if self.stacks != enabled {
            self.stacks = enabled;

            if enabled && let RuntimeState::Stopped(c) = &self.manager {
                match c.clone().run() {
                    Ok(c) => self.manager = RuntimeState::Running(c),
                    Err(e) => tracing::error!("Failed to stop stacks docker image: {}", e),
                }
            }
        } else if let RuntimeState::Running(c) = &self.manager {
            match c.clone().stop() {
                Ok(c) => self.manager = RuntimeState::Stopped(c),
                Err(e) => tracing::error!("Failed to stop stacks docker image: {}", e),
            }
        }
    }
}

impl Message<GetConfig> for Worker {
    type Reply = (u16, PathBuf);

    async fn handle(
        &mut self,
        _msg: GetConfig,
        _ctx: &mut Context<Self, Self::Reply>,
    ) -> Self::Reply {
        (self.port, self.config_dir.clone())
    }
}

impl Message<ListStracks> for Worker {
    type Reply = Result<Vec<String>>;

    async fn handle(
        &mut self,
        _msg: ListStracks,
        _ctx: &mut Context<Self, Self::Reply>,
    ) -> Self::Reply {
        match &self.manager {
            RuntimeState::Running(docker_manager) => docker_manager.list_stacks().await,
            _ => Ok(vec![]),
        }
    }
}

impl Message<CreateStack> for Worker {
    type Reply = Result<()>;

    async fn handle(
        &mut self,
        CreateStack(slug): CreateStack,
        _ctx: &mut Context<Self, Self::Reply>,
    ) -> Self::Reply {
        match &self.manager {
            RuntimeState::Running(docker_manager) => docker_manager.create_stack(&slug).await,
            _ => Ok(()),
        }
    }
}

impl Message<RemoveStack> for Worker {
    type Reply = Result<()>;

    async fn handle(
        &mut self,
        RemoveStack(slug): RemoveStack,
        _ctx: &mut Context<Self, Self::Reply>,
    ) -> Self::Reply {
        println!("{slug}");
        match &self.manager {
            RuntimeState::Running(docker_manager) => docker_manager.remove_stack(&slug).await,
            _ => Ok(()),
        }
    }
}

impl Actor for Worker {
    type Error = color_eyre::Report;

    async fn on_panic(
        &mut self,
        _actor_ref: WeakActorRef<Self>,
        err: PanicError,
    ) -> std::result::Result<std::ops::ControlFlow<ActorStopReason>, Self::Error> {
        error!("ethui_stacks panic: {}", err);
        Ok(std::ops::ControlFlow::Continue(()))
    }
}

impl Worker {
    pub fn new(port: u16, config_dir: PathBuf) -> color_eyre::Result<Self> {
        let manager = match start_stacks(port, config_dir.clone()) {
            Ok(manager) => RuntimeState::Running(manager),
            _ => RuntimeState::Error,
        };

        Ok(Self {
            stacks: !matches!(manager, RuntimeState::Running(_)),
            port,
            config_dir,
            manager,
        })
    }
}
