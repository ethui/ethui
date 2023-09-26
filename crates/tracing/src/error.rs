use tracing::subscriber::SetGlobalDefaultError;

#[derive(Debug, thiserror::Error)]
pub enum TracingError {
    #[error(transparent)]
    SetGlobal(#[from] SetGlobalDefaultError),
}

pub type TracingResult<T> = std::result::Result<T, TracingError>;
