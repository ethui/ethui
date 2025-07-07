use std::path::PathBuf;

use kameo::{Actor, actor::ActorRef, message::Message};

use crate::docker::{start_stacks, stop_stacks};

pub struct Worker {
    pub stacks: bool,
    pub port: u16,
    pub config_dir: PathBuf,
}

pub enum Msg {
    SetEnabled(bool),
}

impl Message<Msg> for Worker {
    type Reply = ();

    async fn handle(
        &mut self,
        msg: Msg,
        _ctx: &mut kameo::message::Context<Self, Self::Reply>,
    ) -> Self::Reply {
        match msg {
            Msg::SetEnabled(enabled) => {
                self.stacks = enabled;
                if enabled {
                    start_stacks(self.port, self.config_dir.clone()).unwrap_or_else(|e| {
                        tracing::error!("Failed to start stacks docker image: {}", e);
                    });
                } else {
                    stop_stacks(self.port, self.config_dir.clone()).unwrap_or_else(|e| {
                        tracing::error!("Failed to stop stacks docker image: {}", e);
                    });
                }
            }
        }
    }
}

impl Actor for Worker {
    type Error = color_eyre::Report;

    async fn on_start(&mut self, _actor_ref: ActorRef<Self>) -> color_eyre::Result<()> {
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
