mod ext;

use std::{ops::ControlFlow, path::PathBuf};

use ethui_types::prelude::*;
pub use ext::StacksActorExt;
use kameo::prelude::*;
use tracing::error;

use crate::docker::{ContainerNotRunning, ContainerRunning, DockerManager, initialize};

pub fn stacks() -> ActorRef<StacksActor> {
    try_stacks().expect("stacks actor not initialized")
}

pub fn try_stacks() -> color_eyre::Result<ActorRef<StacksActor>> {
    ActorRef::<StacksActor>::lookup("stacks")?
        .ok_or_else(|| color_eyre::eyre::eyre!("stacks actor not found"))
}

#[derive(Clone, Debug)]
pub struct StacksActor {
    pub enabled: bool,
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

impl Actor for StacksActor {
    type Args = (u16, PathBuf);
    type Error = color_eyre::Report;

    async fn on_start(args: Self::Args, _actor_ref: ActorRef<Self>) -> color_eyre::Result<Self> {
        Self::new(args.0, args.1)
    }

    async fn on_panic(
        &mut self,
        _actor_ref: WeakActorRef<Self>,
        err: PanicError,
    ) -> color_eyre::Result<ControlFlow<ActorStopReason>> {
        error!("stacks actor panic: {}", err);
        Ok(ControlFlow::Continue(()))
    }
}

#[derive(Debug, Serialize)]
pub struct RuntimeStateResponse {
    pub enabled: bool,
    pub error: bool,
    pub state: String,
}

#[messages]
impl StacksActor {
    #[message]
    fn set_enabled(&mut self, enabled: bool) {
        if self.enabled == enabled {
            return;
        }

        self.enabled = enabled;

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

    #[message]
    fn get_config(&self) -> (u16, PathBuf) {
        (self.port, self.config_dir.clone())
    }

    #[message]
    async fn list_stacks(&self) -> color_eyre::Result<Vec<String>> {
        match &self.manager {
            RuntimeState::Running(docker_manager) => docker_manager.list_stacks().await,
            _ => Ok(vec![]),
        }
    }

    #[message]
    async fn create_stack(&self, slug: String) -> color_eyre::Result<()> {
        match &self.manager {
            RuntimeState::Running(docker_manager) => docker_manager.create_stack(&slug).await,
            _ => Ok(()),
        }
    }

    #[message]
    async fn remove_stack(&self, slug: String) -> color_eyre::Result<()> {
        match &self.manager {
            RuntimeState::Running(docker_manager) => docker_manager.remove_stack(&slug).await,
            _ => Ok(()),
        }
    }

    #[message]
    fn shutdown(&mut self) {
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

    #[message]
    fn initializing(&mut self) -> color_eyre::Result<()> {
        if let RuntimeState::Initializing = &self.manager {
            match initialize(self.port, self.config_dir.clone()) {
                Ok(manager) => {
                    if self.enabled {
                        match manager.run() {
                            Ok(c) => self.manager = RuntimeState::Running(c),
                            Err(e) => {
                                tracing::error!("Failed to start stacks docker image: {}", e);

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

    #[message]
    fn get_runtime_state(&self) -> color_eyre::Result<RuntimeStateResponse> {
        Ok(RuntimeStateResponse {
            enabled: self.enabled,
            error: matches!(self.manager, RuntimeState::Error(_)),
            state: self.manager.as_str().to_string(),
        })
    }

    fn new(port: u16, config_dir: PathBuf) -> color_eyre::Result<Self> {
        Ok(Self {
            enabled: false,
            port,
            config_dir,
            manager: RuntimeState::Initializing,
        })
    }
}
