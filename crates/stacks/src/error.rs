use crate::actor::{self};

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("IO error: {0}")]
    IO(#[from] std::io::Error),

    #[error("serialization error: {0}")]
    Serde(#[from] serde_json::Error),

    #[error(transparent)]
    Notify(#[from] notify::Error),

    #[error("Failed to shutdown task")]
    FailedToShutdown,

    #[error("Send error")]
    SendError,

    #[error(transparent)]
    ActorSend(#[from] kameo::error::SendError<actor::Msg>),

    #[error("Actor lookup error")]
    ActorNotFound,

    #[error(transparent)]
    RegistryError(#[from] kameo::error::RegistryError),
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
