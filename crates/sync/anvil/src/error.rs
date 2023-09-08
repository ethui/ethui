use ethers::types::H256;
#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("Watcher error")]
    Watcher,

    #[error(transparent)]
    DB(#[from] iron_db::Error),

    #[error(transparent)]
    EthersProvider(#[from] ethers::providers::ProviderError),

    #[error("Transaction not found: {0}")]
    TxNotFound(H256),

    #[error("Block number missing from trace or transaction")]
    BlockNumberMissing,

    #[error("Failed to fetch ERC721 data")]
    Erc721FailedToFetchData,
}

pub type Result<T> = std::result::Result<T, Error>;
