#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("Unsupported chain id: {0}")]
    UnsupportedChainId(u32),

    #[error(transparent)]
    DB(#[from] ethui_db::Error),

    #[error("Serialization error: {0}")]
    Serde(#[from] serde_json::Error),

    #[error(transparent)]
    Url(#[from] url::ParseError),

    #[error("request error: {0}")]
    Reqwest(#[from] reqwest::Error),
}

pub type Result<T> = std::result::Result<T, Error>;

impl serde::Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
