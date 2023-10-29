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

impl serde::Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
