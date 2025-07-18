use std::path::PathBuf;

use kameo::prelude::*;
use tracing::error;

use crate::docker::{start_stacks, stop_stacks};

pub struct Worker {
    pub stacks: bool,
    pub port: u16,
    pub config_dir: PathBuf,
}

pub struct SetEnabled(pub bool);

impl Message<SetEnabled> for Worker {
    type Reply = ();

    async fn handle(
        &mut self,
        SetEnabled(enabled): SetEnabled,
        _ctx: &mut Context<Self, Self::Reply>,
    ) -> Self::Reply {
        if self.stacks != enabled {
            self.stacks = enabled;

            if enabled {
                if let Err(e) = start_stacks(self.port, self.config_dir.clone()) {
                    tracing::error!("Failed to start stacks docker image: {}", e);
                }
            } else if let Err(e) = stop_stacks(self.port, self.config_dir.clone()) {
                tracing::error!("Failed to stop stacks docker image: {}", e);
            }
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
    pub fn new(port: u16, config_dir: PathBuf) -> Self {
        Self {
            stacks: false,
            port,
            config_dir,
        }
    }
}
