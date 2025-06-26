use std::path::PathBuf;

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("IO error: {0}")]
    IO(#[from] std::io::Error),

    #[error("Docker command failed: {0}")]
    Command(String),

    #[error("Docker is not installed or not in PATH")]
    DockerNotInstalled,

    #[error("Docker image '{0}' not found")]
    ImageNotFound(String),

    #[error("Could not create data directory '{0}': {1}")]
    DirectoryCreate(PathBuf, std::io::Error),

    #[error("Container '{0}' is not running")]
    ContainerNotRunning(String),

    #[error("serialization error: {0}")]
    Serde(#[from] serde_json::Error),

    #[error(transparent)]
    Notify(#[from] notify::Error),

    #[error("Failed to shutdown task")]
    FailedToShutdown,

    #[error("Send error")]
    SendError,

    #[error(transparent)]
    ActorSend(#[from] kameo::error::SendError<crate::actor::Msg>),

    #[error("Actor lookup error")]
    ActorNotFound,

    #[error(transparent)]
    RegistryError(#[from] kameo::error::RegistryError),
}

impl serde::Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
