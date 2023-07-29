use ethers::types::H256;
use iron_types::UIEvent;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("Watcher error")]
    Watcher,

    #[error(transparent)]
    DB(#[from] iron_db::Error),

    #[error(transparent)]
    WindowSend(#[from] tokio::sync::mpsc::error::SendError<UIEvent>),

    #[error(transparent)]
    EthersProvider(#[from] ethers::providers::ProviderError),

    #[error("Transaction not found: {0}")]
    TxNotFound(H256),

    #[error("Block number missing from trace or transaction")]
    BlockNumberMissing,
}

pub type Result<T> = std::result::Result<T, Error>;
