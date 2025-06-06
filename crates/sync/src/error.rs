use alloy::transports::{RpcError, TransportErrorKind};

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("Invalid Network {0}")]
    InvalidNetwork(u32),

    #[error(transparent)]
    Network(#[from] ethui_networks::Error),

    #[error(transparent)]
    Provider(#[from] RpcError<TransportErrorKind>),

    #[error(transparent)]
    Anvil(#[from] ethui_sync_anvil::Error),

    #[error("TX not found {0}")]
    TxNotFound(ethui_types::B256),

    #[error(transparent)]
    Db(#[from] ethui_db::Error),

    #[error("No API Key")]
    NoApiKey,

    #[error("Alchemy Error {0}")]
    Alchemy(#[from] ethui_sync_alchemy::Error),
}

pub type Result<T> = std::result::Result<T, Error>;

impl serde::Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
