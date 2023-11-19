use ethers::prelude::{signer::SignerMiddlewareError, *};
use iron_types::Address;

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
    SignerMiddleware(#[from] SignerMiddlewareError<Provider<Http>, iron_wallets::Signer>),

    #[error(transparent)]
    EthersProvider(#[from] ethers::providers::ProviderError),

    #[error("Signer error: {0}")]
    Signer(String),

    #[error(transparent)]
    Wallet(#[from] ethers::signers::WalletError),

    #[error(transparent)]
    JsonRpc(#[from] jsonrpsee::core::Error),

    #[error("asd")]
    JsonRpcObject(#[from] jsonrpsee::types::ErrorObjectOwned),

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

pub(crate) fn to_jsonrpsee_error(err: Error) -> jsonrpsee::types::ErrorObjectOwned {
    let code = match err {
        Error::TxDialogRejected | Error::SignatureRejected => 4001,
        Error::WalletNotFound(..) => 4100,
        _ => -32603,
    };
    jsonrpsee::types::ErrorObject::owned(code, err.to_string(), Option::<()>::None)
}

pub(crate) fn ethers_to_jsonrpsee_error(
    err: ethers::providers::ProviderError,
) -> jsonrpsee::types::ErrorObjectOwned {
    // TODO:
    jsonrpsee::types::ErrorObject::owned(-32603, err.to_string(), Option::<()>::None)
}

impl serde::Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
