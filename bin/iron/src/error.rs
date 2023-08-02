#[derive(thiserror::Error, Debug)]
pub enum AppError {
    #[error(transparent)]
    Core(#[from] iron_forge::Error),

    #[error(transparent)]
    DB(#[from] iron_db::Error),

    #[error(transparent)]
    FixPathEnv(#[from] fix_path_env::Error),

    #[error(transparent)]
    TauriError(#[from] tauri::Error),

    #[error(transparent)]
    Tracing(#[from] iron_tracing::TracingError),
}

pub type AppResult<T> = std::result::Result<T, AppError>;
