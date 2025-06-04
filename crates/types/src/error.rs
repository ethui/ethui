use alloy::transports::TransportErrorKind;

#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error(transparent)]
    TransportErrorKind(#[from] alloy::transports::RpcError<TransportErrorKind>),
}

pub type Result<T> = std::result::Result<T, Error>;
