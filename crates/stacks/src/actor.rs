use std::path::PathBuf;

use ethui_types::prelude::*;
use kameo::prelude::*;
use tracing::error;

use crate::docker::{
    ContainerNotRunning, ContainerRunning, DockerManager, initialize, start_stacks,
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

#[derive(Debug, Clone)]
pub enum RuntimeState {
    Error(String),
    Initializing,
    Stopped(DockerManager<ContainerNotRunning>),
    Running(DockerManager<ContainerRunning>),
}

impl RuntimeState {
    pub fn as_str(&self) -> &'static str {
        match self {
            RuntimeState::Error(e) => Box::leak(e.to_owned().into_boxed_str()),
            RuntimeState::Initializing => "Initializing",
            RuntimeState::Stopped(_) => "Stopped",
            RuntimeState::Running(_) => "Running",
        }
    }
}

pub struct Initializing();
pub struct SetEnabled(pub bool);
pub struct GetConfig();
pub struct GetRuntimeState();
pub struct ListStracks();
pub struct CreateStack(pub String);
pub struct RemoveStack(pub String);
pub struct Shutdown();

impl Message<SetEnabled> for Worker {
    type Reply = ();

    async fn handle(
        &mut self,
        SetEnabled(enabled): SetEnabled,
        _ctx: &mut Context<Self, Self::Reply>,
    ) -> Self::Reply {
        if self.stacks == enabled {
            return;
        }

        self.stacks = enabled;

        match (&self.manager, enabled) {
            (RuntimeState::Stopped(manager), true) => match manager.clone().run() {
                Ok(running_manager) => {
                    self.manager = RuntimeState::Running(running_manager);
                }
                Err(e) => {
                    self.manager = RuntimeState::Error(e.to_string());
                }
            },
            (RuntimeState::Running(manager), false) => match manager.clone().stop() {
                Ok(stopped_manager) => {
                    self.manager = RuntimeState::Stopped(stopped_manager);
                }
                Err(e) => {
                    tracing::error!("Failed to stop stacks docker image: {}", e);
                }
            },
            (RuntimeState::Error { .. }, true) => {
                self.manager = RuntimeState::Initializing;
            }
            _ => (),
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
        match &self.manager {
            RuntimeState::Running(docker_manager) => docker_manager.remove_stack(&slug).await,
            _ => Ok(()),
        }
    }
}

impl Message<Shutdown> for Worker {
    type Reply = ();

    async fn handle(
        &mut self,
        _msg: Shutdown,
        _ctx: &mut Context<Self, Self::Reply>,
    ) -> Self::Reply {
        if let RuntimeState::Running(docker_manager) = &self.manager {
            match docker_manager.clone().stop() {
                Ok(c) => {
                    tracing::info!("Stacks Docker container stopped successfully");
                    self.manager = RuntimeState::Stopped(c);
                }
                Err(e) => {
                    tracing::error!("Failed to stop stacks Docker container: {}", e);
                }
            }
        }
    }
}

impl Message<Initializing> for Worker {
    type Reply = Result<()>;

    async fn handle(
        &mut self,
        _msg: Initializing,
        _ctx: &mut Context<Self, Self::Reply>,
    ) -> Self::Reply {
        if let RuntimeState::Initializing = &self.manager {
            match initialize(self.port, self.config_dir.clone()) {
                Ok(manager) => {
                    if self.stacks {
                        match manager.run() {
                            Ok(c) => self.manager = RuntimeState::Running(c),
                            Err(e) => {
                                tracing::error!("Failed to stop stacks docker image: {}", e);

                                self.manager = RuntimeState::Error(e.to_string());
                            }
                        }
                    } else {
                        self.manager = RuntimeState::Stopped(manager)
                    }
                }

                Err(e) => {
                    self.manager = RuntimeState::Error(e.to_string());
                }
            }
        }
        Ok(())
    }
}

impl Message<GetRuntimeState> for Worker {
    type Reply = Result<(bool, bool, String)>;

    async fn handle(
        &mut self,
        _msg: GetRuntimeState,
        _ctx: &mut Context<Self, Self::Reply>,
    ) -> Self::Reply {
        Ok((
            self.stacks,
            if let RuntimeState::Error(_) = self.manager {
                true
            } else {
                false
            },
            self.manager.as_str().to_string(),
        ))
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
        dbg!(err);
        Ok(std::ops::ControlFlow::Continue(()))
    }
}

impl Worker {
    pub fn new(port: u16, config_dir: PathBuf) -> color_eyre::Result<Self> {
        Ok(Self {
            stacks: false,
            port,
            config_dir,
            manager: RuntimeState::Initializing,
        })
    }
}
