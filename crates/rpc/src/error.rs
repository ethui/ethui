use ethers::{
    core::k256::ecdsa::SigningKey,
    prelude::{signer::SignerMiddlewareError, *},
    signers,
};
use iron_types::Address;
use jsonrpc_core::ErrorCode;

#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("Transaction rejected")]
    TxDialogRejected,

    #[error("Signature rejected")]
    SignatureRejected,

    #[error("Unknown wallet: {0}")]
    WalletNotFound(Address),

    #[error("Error building signer: {0}")]
    SignerBuild(String),

    #[error(transparent)]
    SignerMiddleware(#[from] SignerMiddlewareError<Provider<Http>, signers::Wallet<SigningKey>>),

    #[error(transparent)]
    Wallet(#[from] ethers::signers::WalletError),

    #[error(transparent)]
    JsonRpc(#[from] jsonrpc_core::Error),

    #[error(transparent)]
    Dialog(#[from] iron_dialogs::Error),

    #[error(transparent)]
    Connection(#[from] iron_connections::Error),

    #[error("serialization error: {0}")]
    Serde(#[from] serde_json::Error),

    #[error(transparent)]
    IO(#[from] std::io::Error),

    #[error("cannot simulate transaction")]
    CannotSimulate,
}

pub type Result<T> = std::result::Result<T, Error>;

impl From<Error> for jsonrpc_core::Error {
    fn from(value: Error) -> Self {
        Self {
            code: ErrorCode::ServerError(0),
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

pub(crate) fn ethers_to_jsonrpc_error(e: ProviderError) -> jsonrpc_core::Error {
    // TODO: probable handle more error types here
    match e {
        ProviderError::JsonRpcClientError(e) => {
            if let Some(e) = e.as_error_response() {
                jsonrpc_core::Error {
                    code: ErrorCode::ServerError(e.code),
                    data: e.data.clone(),
                    message: e.message.clone(),
                }
            } else if e.as_serde_error().is_some() {
                jsonrpc_core::Error::invalid_request()
            } else {
                jsonrpc_core::Error::internal_error()
            }
        }
        _ => jsonrpc_core::Error::internal_error(),
    }
}
