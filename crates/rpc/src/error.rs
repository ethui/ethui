use alloy::transports::{RpcError, TransportErrorKind};
use ethui_types::prelude::*;
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

    #[error("failed to parse URL {0}")]
    CannotParseUrl(String),

    #[error(transparent)]
    SignerError(#[from] alloy::signers::Error),

    #[error(transparent)]
    Transport(#[from] alloy::transports::TransportError),

    #[error("Ethui error: {0}")]
    Ethui(#[from] color_eyre::Report),

    #[error(transparent)]
    JsonRpc(#[from] jsonrpc_core::Error),

    #[error("Unrecognized chainID {0}. Try adding the chain using wallet_addEthereumChain first.")]
    UnrecognizedChainId(u32),

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

    #[error("Invalid token")]
    TokenInvalid,

    #[error("Invalid token: 'symbol' is needed")]
    SymbolMissing,

    #[error("Invalid symbol : longer than 11 characters")]
    SymbolInvalid,

    #[error("Invalid decimals : must be 0 <= 36")]
    DecimalsInvalid,

    #[error("The Provider is not connected to the requested chain")]
    NetworkInvalid,

    #[error("Asset type {0} not supported")]
    TypeInvalid(String),

    #[error("Added asset type {0} does not match existing token type {1}")]
    ErcTypeInvalid(String, String),

    #[error("Suggested asset is not owned by the selected account")]
    ErcWrongOwner,

    #[error(
        "Unable to verify ownership. Possibly because the standard is not supported or the user's currently selected network does not match the chain of the asset in question."
    )]
    ErcInvalid,

    #[error("Invalid params for JSON-RPC method")]
    InvalidParams,
}

pub type Result<T> = std::result::Result<T, Error>;

impl From<Error> for jsonrpc_core::Error {
    fn from(value: Error) -> Self {
        let code = match value {
            Error::TxDialogRejected | Error::SignatureRejected | Error::UserRejectedDialog => {
                ErrorCode::ServerError(4001)
            }
            Error::ParseError => ErrorCode::ParseError,
            Error::TypeInvalid(..)
            | Error::ErcTypeInvalid(..)
            | Error::ErcInvalid
            | Error::ErcWrongOwner
            | Error::DecimalsInvalid
            | Error::TokenInvalid
            | Error::SymbolMissing
            | Error::SymbolInvalid => ErrorCode::InvalidParams,
            Error::WalletNotFound(..) => ErrorCode::ServerError(4100),
            Error::NetworkInvalid => ErrorCode::ServerError(4901),
            // https://github.com/MetaMask/metamask-mobile/blob/5fe6aceffcf4c80ed1f3530282640aebcd201935/app/core/RPCMethods/wallet_switchEthereumChain.js#L88C11-L88C15
            Error::Ethui(ref e) => {
                if e.to_string().to_lowercase().contains("invalid chain id") {
                    ErrorCode::ServerError(4902)
                } else {
                    ErrorCode::InternalError
                }
            }
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

pub(crate) fn alloy_to_jsonrpc_error(e: RpcError<TransportErrorKind>) -> jsonrpc_core::Error {
    // TODO: probable handle more error types here
    if let Some(e) = e.as_error_resp() {
        jsonrpc_core::Error {
            code: ErrorCode::ServerError(e.code),
            data: e.data.clone().map(|d| serde_json::to_value(d).unwrap()),
            message: e.message.to_string(),
        }
    } else {
        jsonrpc_core::Error::internal_error()
    }
}

pub(crate) fn to_jsonrpc_error(e: color_eyre::Report) -> jsonrpc_core::Error {
    jsonrpc_core::Error {
        code: ErrorCode::InternalError,
        data: None,
        message: e.to_string(),
    }
}
