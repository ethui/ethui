#[derive(thiserror::Error, Debug)]
pub enum AppError {
    #[error("invalid network")]
    InvalidNetwork,

    #[error(transparent)]
    DB(#[from] iron_db::Error),

    #[error(transparent)]
    Forge(#[from] iron_forge::Error),

    #[error(transparent)]
    Http(#[from] iron_http::Error),

    #[error(transparent)]
    FixPathEnv(#[from] fix_path_env::Error),

    #[error(transparent)]
    TauriError(#[from] tauri::Error),

    #[error(transparent)]
    Tracing(#[from] iron_tracing::TracingError),

    #[error(transparent)]
    Settings(#[from] iron_settings::Error),

    #[error("App already running")]
    NamedLock(#[from] named_lock::Error),
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
