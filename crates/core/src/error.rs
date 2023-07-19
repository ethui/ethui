use crate::app;

#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error(transparent)]
    DB(#[from] iron_db::Error),

    #[error(transparent)]
    Websocket(#[from] tungstenite::Error),

    #[error(transparent)]
    IO(#[from] std::io::Error),

    #[error(transparent)]
    WindowSend(#[from] tokio::sync::mpsc::error::SendError<app::Event>),

    #[error(transparent)]
    TauriError(#[from] tauri::Error),
}

pub type Result<T> = std::result::Result<T, Error>;
