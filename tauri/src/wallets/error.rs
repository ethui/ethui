use serde::Serialize;

#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("duplicate wallet names `{0}`")]
    DuplicateWalletNames(String),

    #[error("invalid wallet index {0}")]
    InvalidWallet(usize),

    #[error("IO error: {0}")]
    IO(#[from] std::io::Error),

    #[error("serialization error: {0}")]
    Serde(#[from] serde_json::Error),

    #[error("signer error {0}")]
    SignerError(#[from] ethers::signers::WalletError),
}

pub type Result<T> = std::result::Result<T, Error>;

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
