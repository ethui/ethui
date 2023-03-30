#[derive(thiserror::Error, Debug)]
pub enum Error {
    WebsocketError(#[from] tungstenite::Error),
    JsonError(#[from] serde_json::Error),
    SqlxError(#[from] sqlx::Error),
    SqlxMigrateError(#[from] sqlx::migrate::MigrateError),
}

pub type Result<T> = std::result::Result<T, Error>;

impl std::fmt::Display for Error {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        use Error::*;

        match self {
            WebsocketError(e) => write!(f, "WebsocketError: {}", e),
            JsonError(e) => write!(f, "JsonError: {}", e),
            SqlxError(e) => write!(f, "SqlxError: {}", e),
            SqlxMigrateError(e) => write!(f, "SqlxMigrateError: {}", e),
        }
    }
}
