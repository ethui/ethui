use tracing::subscriber::SetGlobalDefaultError;

#[derive(Debug, thiserror::Error)]
pub enum TracingError {
    #[error(transparent)]
    SetGlobal(#[from] SetGlobalDefaultError),

    #[error("Reload handle not set")]
    ReloadHandleNotSet,

    #[error(transparent)]
    ReloadError(#[from] tracing_subscriber::reload::Error),

    #[error(transparent)]
    EnvFilterParseError(#[from] tracing_subscriber::filter::ParseError),
}

pub type TracingResult<T> = std::result::Result<T, TracingError>;
