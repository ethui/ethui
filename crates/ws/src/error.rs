use iron_types::AppEvent;

#[derive(thiserror::Error, Debug)]
pub enum WsError {
    #[error(transparent)]
    Websocket(#[from] tungstenite::Error),

    #[error(transparent)]
    IO(#[from] std::io::Error),

    #[error(transparent)]
    WindowSend(#[from] tokio::sync::mpsc::error::SendError<AppEvent>),

    #[error(transparent)]
    TauriError(#[from] tauri::Error),
}

pub type WsResult<T> = std::result::Result<T, WsError>;
