use alloy::transports::{RpcError, TransportErrorKind};

#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error(transparent)]
    Rpc(#[from] RpcError<TransportErrorKind>),
}

pub type Result<T> = std::result::Result<T, Error>;
