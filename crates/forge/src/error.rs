use std::path::PathBuf;

use crate::watcher::WatcherMsg;

#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("file not found: {0}")]
    FileNotFound(PathBuf),

    #[error("error parsing JSON: {0}")]
    Json(#[from] serde_json::Error),

    #[error(transparent)]
    Db(#[from] ethui_db::Error),

    #[error("file does not have the expected schema: {0}")]
    NotAnABI(PathBuf),

    #[error("file has an empty ABI. is it a library?")]
    EmptyABI(PathBuf),

    #[error("invalid chain ID")]
    InvalidChainId,

    #[error(transparent)]
    Ethers(#[from] ethers::providers::ProviderError),

    #[error(transparent)]
    WatcherSendError(#[from] tokio::sync::mpsc::error::SendError<WatcherMsg>),
}

pub type Result<T> = std::result::Result<T, Error>;

impl serde::Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
