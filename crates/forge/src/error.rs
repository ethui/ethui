use std::path::PathBuf;

#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("file not found: {0}")]
    FileNotFound(PathBuf),

    #[error("error parsing JSON: {0}")]
    Json(#[from] serde_json::Error),

    #[error("file does not have the expected schema: {0}")]
    NotAnABI(PathBuf),

    #[error("file has an empty ABI. is it a library?")]
    EmptyABI(PathBuf),
}

pub type Result<T> = std::result::Result<T, Error>;
