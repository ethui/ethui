mod impersonator;
mod ledger;
mod plaintext;

#[cfg(feature = "hd")]
mod hd_wallet;

#[cfg(feature = "keystore")]
mod json_keystore_wallet;

#[cfg(feature = "pkey")]
mod private_key;

#[cfg(feature = "hd")]
pub use hd_wallet::HDWallet;
pub use impersonator::Impersonator;
#[cfg(feature = "keystore")]
pub use json_keystore_wallet::JsonKeystoreWallet;
pub use ledger::LedgerWallet;
pub use plaintext::PlaintextWallet;
#[cfg(feature = "pkey")]
pub use private_key::PrivateKeyWallet;
