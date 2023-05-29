use crate::app;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("Watcher error")]
    Watcher,

    #[error(transparent)]
    DB(#[from] crate::db::Error),

    #[error(transparent)]
    WindowSend(#[from] tokio::sync::mpsc::error::SendError<app::Event>),

    #[error(transparent)]
    Reqwest(#[from] reqwest::Error),
}

pub type Result<T> = std::result::Result<T, Error>;
