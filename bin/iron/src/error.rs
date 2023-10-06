#[derive(thiserror::Error, Debug)]
pub enum AppError {
    #[error("invalid network")]
    InvalidNetwork,

    #[error(transparent)]
    DB(#[from] iron_db::Error),

    #[error(transparent)]
    Network(#[from] iron_networks::Error),

    #[error(transparent)]
    Forge(#[from] iron_forge::Error),

    #[error(transparent)]
    FixPathEnv(#[from] fix_path_env::Error),

    #[error(transparent)]
    TauriError(#[from] tauri::Error),

    #[error(transparent)]
    Tracing(#[from] iron_tracing::TracingError),
}

pub type AppResult<T> = std::result::Result<T, AppError>;

impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
