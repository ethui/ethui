use tokio::sync::mpsc::{self};

use crate::error::Result;
use std::path::PathBuf;

pub enum Msg {
    UpdateRoots(Vec<PathBuf>),
    PollFoundryRoots,
    NewContract,
}

pub struct Handle {
    snd: mpsc::Sender<Msg>,
}

impl Handle {
    pub(super) fn new(snd: mpsc::Sender<Msg>) -> Self {
        Self { snd }
    }

    pub async fn update_roots(&self, roots: Vec<PathBuf>) -> Result<()> {
        self.snd.send(Msg::UpdateRoots(roots)).await?;
        Ok(())
    }

    pub async fn contract_found(&self) -> Result<()> {
        self.snd.send(Msg::NewContract).await?;
        Ok(())
    }
}
