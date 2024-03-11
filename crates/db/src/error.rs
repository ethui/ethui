use ethers::prelude::errors::EtherscanError;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    Sqlx(#[from] sqlx::Error),

    #[error(transparent)]
    SqlxMigrate(#[from] sqlx::migrate::MigrateError),

    #[error(transparent)]
    Etherscan(#[from] EtherscanError),

    #[error("Invalid chain")]
    InvalidChain,

    #[error(transparent)]
    Settings(#[from] iron_settings::Error),

    #[error(transparent)]
    Serde(#[from] serde_json::Error),

    #[error("not found")]
    NotFound,
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
