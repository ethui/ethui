use ethers::{
    prelude::{signer::SignerMiddlewareError, *},
    signers,
};
use ethers_core::k256::ecdsa::SigningKey;
use jsonrpc_core::ErrorCode;

#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("Transaction rejected")]
    TxDialogRejected,

    #[error("Error building signer: {0}")]
    SignerBuild(String),

    #[error(transparent)]
    SignerMiddleware(#[from] SignerMiddlewareError<Provider<Http>, signers::Wallet<SigningKey>>),

    #[error(transparent)]
    JsonRpc(#[from] jsonrpc_core::Error),
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
