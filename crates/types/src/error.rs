use color_eyre::eyre::eyre;

#[derive(Debug)]
pub struct SerializableError(pub color_eyre::Report);

impl std::fmt::Display for SerializableError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl std::error::Error for SerializableError {}

impl serde::Serialize for SerializableError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.0.to_string())
    }
}

impl From<color_eyre::Report> for SerializableError {
    fn from(err: color_eyre::Report) -> Self {
        Self(err)
    }
}

impl<M, E> From<kameo::error::SendError<M, E>> for SerializableError
where
    E: Into<color_eyre::Report>,
{
    fn from(err: kameo::error::SendError<M, E>) -> Self {
        match err {
            kameo::error::SendError::HandlerError(e) => Self(e.into()),
            kameo::error::SendError::MailboxFull(_) => Self(eyre!("Mailbox full")),
            kameo::error::SendError::Timeout(_) => Self(eyre!("Actor timeout")),
            kameo::error::SendError::ActorNotRunning(_) => Self(eyre!("Actor not running")),
            kameo::error::SendError::ActorStopped => Self(eyre!("Actor stopped")),
        }
    }
}

pub type TauriResult<T> = std::result::Result<T, SerializableError>;
