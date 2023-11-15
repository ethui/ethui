use serde::Serialize;
use tokio::sync::oneshot;

#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("duplicate wallet names `{0}`")]
    DuplicateWalletNames(String),

    #[error("invalid wallet name `{0}`")]
    InvalidWalletName(String),

    #[error("invalid wallet index {0}")]
    InvalidWallet(usize),

    #[error("IO error: {0}")]
    IO(#[from] std::io::Error),

    #[error("serialization error: {0}")]
    Serde(#[from] serde_json::Error),

    #[error(transparent)]
    SignerError(#[from] ethers::signers::WalletError),

    #[error("wallet unlock rejected by user")]
    UnlockDialogRejected,

    #[error("user failed to unlock the wallet")]
    UnlockDialogFailed,

    #[error(transparent)]
    Recv(#[from] oneshot::error::RecvError),

    #[error(transparent)]
    Dialog(#[from] iron_dialogs::Error),

    #[error("unknown wallet key: {0}")]
    InvalidKey(String),

    #[error("invalid wallet type: {0}")]
    InvalidWalletType(String),

    #[error("This wallet type cannot sign")]
    WalletCantSign,

    #[error(transparent)]
    ParseInto(#[from] std::num::ParseIntError),

    #[error(transparent)]
    Tokio(#[from] tokio::task::JoinError),

    #[error("Ledger error: {0}")]
    Ledger(String),

    #[error(transparent)]
    GPGME(#[from] gpgme::Error),

    #[error(transparent)]
    FromUtf8(#[from] std::string::FromUtf8Error),
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
