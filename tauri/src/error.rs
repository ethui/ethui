use crate::app;

#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error(transparent)]
    DB(#[from] crate::db::Error),

    #[error(transparent)]
    FixPathEnv(#[from] fix_path_env::Error),

    #[error(transparent)]
    Websocket(#[from] tungstenite::Error),

    #[error(transparent)]
    IO(#[from] std::io::Error),

    #[error(transparent)]
    Eyre(#[from] color_eyre::eyre::Error),

    #[error(transparent)]
    WindowSend(#[from] tokio::sync::mpsc::error::SendError<app::Event>),

    #[error(transparent)]
    TauriError(#[from] tauri::Error),
}

pub type Result<T> = std::result::Result<T, Error>;
