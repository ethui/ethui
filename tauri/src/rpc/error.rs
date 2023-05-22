use ethers::{
    prelude::{signer::SignerMiddlewareError, *},
    signers,
};
use ethers_core::k256::ecdsa::SigningKey;

#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error(transparent)]
    SignerMiddlewareError(
        #[from] SignerMiddlewareError<Provider<Http>, signers::Wallet<SigningKey>>,
    ),
}

pub type Result<T> = std::result::Result<T, Error>;
