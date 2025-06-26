use std::path::PathBuf;

use ethui_args::Args;
use kameo::{actor::ActorRef, message::Message, Actor};
use tracing::info;

use crate::{docker::start_stacks, error::Result};

pub struct Worker {
    pub stacks: bool,
    pub port: u16,
    pub config_dir: PathBuf,
}

pub enum Msg {
    SetStacks(bool),
}

impl Message<Msg> for Worker {
    type Reply = ();

    async fn handle(
        &mut self,
        msg: Msg,
        _ctx: &mut kameo::message::Context<Self, Self::Reply>,
    ) -> Self::Reply {
        match msg {
            Msg::SetStacks(enabled) => {
                self.stacks = enabled;
                if enabled {
                    start_stacks(self.port, self.config_dir.clone()).unwrap_or_else(|e| {
                        tracing::error!("Failed to start stacks docker image: {}", e);
                    });
                } else {
                    info!("Stopping stacks docker image...");
                }
            }
        }
    }
}

impl Actor for Worker {
    type Error = crate::error::Error;

    async fn on_start(&mut self, _actor_ref: ActorRef<Self>) -> Result<()> {
        Ok(())
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
