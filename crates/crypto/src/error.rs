#[derive(Debug, thiserror::Error)]
pub enum CryptoError {
    #[error("Invalid password")]
    InvalidPassword,

    #[error(transparent)]
    Serde(#[from] serde_json::Error),
}

pub type CryptoResult<T> = std::result::Result<T, CryptoError>;
