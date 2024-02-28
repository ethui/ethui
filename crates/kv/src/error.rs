#[derive(thiserror::Error, Debug)]
pub enum KvError {
    #[error(transparent)]
    IO(#[from] std::io::Error),

    #[error(transparent)]
    SerdeJson(#[from] serde_json::Error),
}

pub type KvResult<T> = std::result::Result<T, KvError>;
