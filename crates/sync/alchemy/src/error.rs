use ethers::providers::JsonRpcError;
use iron_types::B256;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    DB(#[from] iron_db::Error),

    #[error("IO error: {0}")]
    IO(#[from] std::io::Error),

    #[error(transparent)]
    KV(#[from] iron_kv::KvError),

    #[error("serialization error: {0}")]
    Serde(#[from] serde_json::Error),

    #[error(transparent)]
    Url(#[from] url::ParseError),

    #[error("Unsupported chain id: {0}")]
    UnsupportedChainId(u32),

    #[error("Alchemy API Key not found")]
    NoAPIKey,

    #[error(transparent)]
    JoinError(#[from] tokio::task::JoinError),

    #[error(transparent)]
    ProviderError(#[from] ethers::providers::ProviderError),

    #[error(transparent)]
    JsonRpcError(#[from] JsonRpcError),

    #[error("Transaction not found: {0}")]
    TxNotFound(B256),
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
