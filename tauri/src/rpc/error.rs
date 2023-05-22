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
