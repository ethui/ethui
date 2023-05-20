use std::path::PathBuf;

#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("file not found: {0}")]
    FileNotFound(PathBuf),

    #[error("error parsing JSON: {0}")]
    JSON(#[from] serde_json::Error),

    #[error("file does not have the expected schema: {0}")]
    NotAnABI(PathBuf),
}

pub type Result<T> = std::result::Result<T, Error>;
