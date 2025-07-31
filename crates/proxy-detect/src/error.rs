use thiserror::Error;

#[derive(Debug, Error)]
pub enum DetectProxyError {
    #[error("RPC error: {0}")]
    Provider(#[from] alloy::transports::RpcError<alloy::transports::TransportErrorKind>),

    #[error("Invalid length")]
    InvalidLength,
}

pub type DetectProxyResult<T> = Result<T, DetectProxyError>;
