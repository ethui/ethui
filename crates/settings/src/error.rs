#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("IO error: {0}")]
    IO(#[from] std::io::Error),

    #[error("serialization error: {0}")]
    Serde(#[from] serde_json::Error),

    #[error("Etherscan API key not set")]
    EtherscanKeyNotSet,

    #[error(transparent)]
    AutoLaunch(#[from] auto_launch::Error),

    #[error(transparent)]
    Tracing(#[from] ethui_tracing::TracingError),

    #[error("Settings actor not found")]
    ActorNotFound,

    #[error("Actor send error: {0}")]
    ActorSend(String),

    #[error("Actor spawn error: {0}")]
    ActorSpawn(String),
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

// Implement From for all message types' send errors
impl<M> From<kameo::error::SendError<M, crate::Error>> for Error {
    fn from(e: kameo::error::SendError<M, crate::Error>) -> Self {
        Error::ActorSend(format!("{}", e))
    }
}

impl<M> From<kameo::error::SendError<M>> for Error {
    fn from(e: kameo::error::SendError<M>) -> Self {
        Error::ActorSend(format!("{}", e))
    }
}
