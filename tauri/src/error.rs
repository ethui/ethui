use crate::app::IronEvent;

#[derive(thiserror::Error, Debug)]
pub enum Error {
    Websocket(#[from] tungstenite::Error),
    Json(#[from] serde_json::Error),
    Sqlx(#[from] sqlx::Error),
    SqlxMigrate(#[from] sqlx::migrate::MigrateError),
    IO(#[from] std::io::Error),
    EthersProvider(#[from] ethers::providers::ProviderError),
    Eyre(#[from] color_eyre::eyre::Error),
    Url(#[from] url::ParseError),
    WindowSend(#[from] tokio::sync::mpsc::error::SendError<IronEvent>),
    Watcher,
}

pub type Result<T> = std::result::Result<T, Error>;

impl std::fmt::Display for Error {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        use Error::*;

        match self {
            Websocket(e) => write!(f, "WebsocketError: {}", e),
            Json(e) => write!(f, "JsonError: {}", e),
            Sqlx(e) => write!(f, "SqlxError: {}", e),
            SqlxMigrate(e) => write!(f, "SqlxMigrateError: {}", e),
            IO(e) => write!(f, "IOError: {}", e),
            EthersProvider(e) => write!(f, "EthersProviderError: {}", e),
            Eyre(e) => write!(f, "EyreError: {}", e),
            Url(e) => write!(f, "URLError: {}", e),
            Watcher => write!(f, "WatcherError"),
            WindowSend(e) => write!(f, "WindowSendError: {}", e),
        }
    }
}
