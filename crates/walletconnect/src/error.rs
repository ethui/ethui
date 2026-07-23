use thiserror::Error;

#[derive(Debug, Error)]
pub enum WcError {
    #[error("relay error: {0}")]
    Relay(#[from] relay_client::error::ClientError),

    #[error("crypto error: {0}")]
    Crypto(String),

    #[error("json error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("hex decode error: {0}")]
    Hex(#[from] hex::FromHexError),

    #[error("invalid URI: {0}")]
    InvalidUri(#[from] url::ParseError),

    #[error("missing field: {0}")]
    MissingField(&'static str),

    #[error("session not found")]
    SessionNotFound,

    #[error("{0}")]
    Other(String),
}

impl From<color_eyre::Report> for WcError {
    fn from(e: color_eyre::Report) -> Self {
        Self::Other(e.to_string())
    }
}

pub type WcResult<T> = Result<T, WcError>;
