use alloy::transports::TransportErrorKind;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    DB(#[from] ethui_db::Error),

    #[error("IO error: {0}")]
    IO(#[from] std::io::Error),

    #[error("serialization error: {0}")]
    Serde(#[from] serde_json::Error),

    #[error(transparent)]
    Url(#[from] url::ParseError),

    #[error("Unsupported chain id: {0}")]
    UnsupportedChainId(u32),

    #[error("Alchemy API Key not found")]
    NoAPIKey,

    #[error(transparent)]
    JoinError(#[from] tokio::task::JoinError),

    #[error(transparent)]
    Alloy(#[from] alloy::transports::RpcError<TransportErrorKind>),

    #[error("Unable to verify ownership. Possibly because the standard is not supported or the user's currently selected network does not match the chain of the asset in question.")]
    ErcInvalid,
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
