use iron_types::AppEvent;

#[derive(thiserror::Error, Debug)]
pub enum AppError {
    #[error(transparent)]
    Core(#[from] iron_core::error::Error),

    #[error(transparent)]
    DB(#[from] iron_db::Error),

    #[error(transparent)]
    FixPathEnv(#[from] fix_path_env::Error),

    #[error(transparent)]
    Eyre(#[from] color_eyre::eyre::Error),

    #[error(transparent)]
    WindowSend(#[from] tokio::sync::mpsc::error::SendError<AppEvent>),

    #[error(transparent)]
    TauriError(#[from] tauri::Error),
}

pub type Result<T> = std::result::Result<T, AppError>;
