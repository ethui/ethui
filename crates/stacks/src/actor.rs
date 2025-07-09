use std::path::PathBuf;

use kameo::{
    Actor,
    message::{Context, Message},
};

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
        msg: SetEnabled,
        _ctx: &mut Context<Self, Self::Reply>,
    ) -> Self::Reply {
        if self.stacks != msg.0 {
            self.stacks = msg.0;

            if msg.0 {
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
