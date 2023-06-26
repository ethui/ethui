use ethers::{providers::JsonRpcError, types::H256};

use crate::app;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    DB(#[from] crate::db::Error),

    #[error("IO error: {0}")]
    IO(#[from] std::io::Error),

    #[error("serialization error: {0}")]
    Serde(#[from] serde_json::Error),

    #[error("error sending event to window: {0}")]
    WindowSend(#[from] tokio::sync::mpsc::error::SendError<app::Event>),

    #[error(transparent)]
    Url(#[from] url::ParseError),

    #[error("Unsupported chain id: {0}")]
    UnsupportedChainId(u32),

    #[error("API Key not found")]
    NoAPIKey,

    #[error(transparent)]
    JoinError(#[from] tokio::task::JoinError),

    #[error(transparent)]
    ProviderError(#[from] ethers::providers::ProviderError),

    #[error(transparent)]
    JsonRpcError(#[from] JsonRpcError),

    #[error("Transaction not found: {0}")]
    TxNotFound(H256),
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
