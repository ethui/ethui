use ethers::prelude::{signer::SignerMiddlewareError, *};
use ethui_types::Address;
use jsonrpc_core::ErrorCode;

#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("Transaction rejected")]
    TxDialogRejected,

    #[error("Signature rejected")]
    SignatureRejected,

    #[error("Unknown wallet name: {0}")]
    WalletNameNotFound(String),

    #[error("Unknown wallet: {0}")]
    WalletNotFound(Address),

    #[error("Error building signer: {0}")]
    SignerBuild(String),

    #[error(transparent)]
    SignerMiddleware(
        #[from] SignerMiddlewareError<Provider<RetryClient<Http>>, ethui_wallets::Signer>,
    ),

    #[error(transparent)]
    Provider(#[from] ethers::providers::ProviderError),

    #[error("Signer error: {0}")]
    Signer(String),

    #[error(transparent)]
    EthuiWallets(#[from] ethui_wallets::Error),

    #[error(transparent)]
    Wallet(#[from] ethers::signers::WalletError),

    #[error(transparent)]
    Network(#[from] ethui_networks::Error),

    #[error(transparent)]
    JsonRpc(#[from] jsonrpc_core::Error),

    #[error(transparent)]
    Dialog(#[from] ethui_dialogs::Error),

    #[error(transparent)]
    Connection(#[from] ethui_connections::Error),

    #[error("serialization error: {0}")]
    Serde(#[from] serde_json::Error),

    #[error(transparent)]
    IO(#[from] std::io::Error),

    #[error("cannot simulate transaction")]
    CannotSimulate,

    #[error("RPC error: {0}")]
    Rpc(i64),

    #[error("Parse error")]
    ParseError,

    #[error("The user rejected the request")]
    UserRejectedDialog,

    #[error("Invalid symbol {0}: longer than 11 characters")]
    SymbolInvalid(String),

    #[error("Invalid decimals {0}: must be 0 <= 36")]
    DecimalsInvalid(u8),

    #[error("The Provider is not connected to the requested chain")]
    NetworkInvalid,

    #[error("Asset type {0} not supported")]
    TypeInvalid(String),
}

pub type Result<T> = std::result::Result<T, Error>;

impl From<Error> for jsonrpc_core::Error {
    fn from(value: Error) -> Self {
        let code = match value {
            Error::TxDialogRejected | Error::SignatureRejected => ErrorCode::ServerError(4001),
            Error::WalletNotFound(..) => ErrorCode::ServerError(4100),
            Error::ParseError => ErrorCode::ServerError(-32700),
            Error::UserRejectedDialog => ErrorCode::ServerError(4001),
            Error::SymbolInvalid(..) => ErrorCode::ServerError(-32602),
            Error::DecimalsInvalid(..) => ErrorCode::ServerError(-32602),
            Error::NetworkInvalid => ErrorCode::ServerError(4901),
            Error::TypeInvalid(..) => ErrorCode::ServerError(-32603),
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
