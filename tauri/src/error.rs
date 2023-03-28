#[derive(thiserror::Error, Debug)]
pub enum Error {
    WebsocketError(#[from] tungstenite::Error),
    JsonError(#[from] serde_json::Error),
    SledError(#[from] sled::Error),
}

pub type Result<T> = std::result::Result<T, Error>;

impl std::fmt::Display for Error {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        use Error::*;

        match self {
            WebsocketError(e) => write!(f, "WebsocketError: {}", e),
            JsonError(e) => write!(f, "JsonError: {}", e),
            SledError(e) => write!(f, "SledError: {}", e),
        }
    }
}
