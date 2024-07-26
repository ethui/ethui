use ethers::providers::JsonRpcError;
use ethui_types::B256;
use jsonrpc_core::ErrorCode;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    DB(#[from] ethui_db::Error),

    #[error("IO error: {0}")]
    IO(#[from] std::io::Error),

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

    #[error("Unable to verify ownership. Possibly because the standard is not supported or the user's currently selected network does not match the chain of the asset in question.")]
    ErcInvalid,

}

pub type Result<T> = std::result::Result<T, Error>;

impl From<Error> for jsonrpc_core::Error {
    fn from(value: Error) -> Self {
        let code = match value {
            Error::ErcInvalid => ErrorCode::ServerError(-32002),
            _ => ErrorCode::InternalError,
        };

        Self {
            code,
            data: None,
            message: value.to_string(),
        }
    }
}

impl serde::Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
