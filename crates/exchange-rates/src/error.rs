#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("request error: {0}")]
    Reqwest(#[from] reqwest::Error),

    #[error("error parsing JSON: {0}")]
    Json(#[from] serde_json::Error),

    #[error("error reading file: {0}")]
    InvalidFile(#[from] std::io::Error),

    #[error(transparent)]
    Ethers(#[from] ethers::providers::ProviderError),
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
