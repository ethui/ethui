use alloy::transports::{RpcError, TransportErrorKind};

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("IO error: {0}")]
    IO(#[from] std::io::Error),

    #[error("serialization error: {0}")]
    Serde(#[from] serde_json::Error),

    #[error(transparent)]
    Url(#[from] url::ParseError),

    #[error("Error running listener: {0}")]
    ErrorRunningListener(String),

    #[error("Invalid chain ID: {0}")]
    InvalidChainId(u32),

    #[error(transparent)]
    Rpc(#[from] RpcError<TransportErrorKind>),

    #[error("Already exists")]
    AlreadyExists,

    #[error("Not exists")]
    NotExists,
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
