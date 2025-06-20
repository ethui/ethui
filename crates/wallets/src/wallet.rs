use async_trait::async_trait;
use enum_dispatch::enum_dispatch;
use ethui_types::{Address, Json};
use serde::{Deserialize, Serialize};

use super::{
    wallets::{self, Impersonator, LedgerWallet, PlaintextWallet},
    Error, Result,
};

#[async_trait]
#[enum_dispatch(Wallet)]
pub trait WalletControl: Sync + Send + Deserialize<'static> + Serialize + std::fmt::Debug {
    fn name(&self) -> String;
    async fn update(mut self, params: Json) -> Result<Wallet>;
    async fn get_current_address(&self) -> Address;
    fn get_current_path(&self) -> String;
    async fn set_current_path(&mut self, path: String) -> Result<()>;
    async fn get_all_addresses(&self) -> Vec<(String, Address)>;

    async fn get_address(&self, path: &str) -> Result<Address>;

    async fn build_signer(&self, chain_id: u32, path: &str) -> Result<crate::signer::Signer>;

    async fn find(&self, address: Address) -> Option<String> {
        let addresses = self.get_all_addresses().await;

        addresses.iter().find_map(|(path, addr)| {
            if *addr == address {
                Some(path.clone())
            } else {
                None
            }
        })
    }

    fn is_dev(&self) -> bool {
        false
    }
}

/// needs to be a separate trait, because enum_dispatch does not allow for static functions
#[async_trait]
pub trait WalletCreate {
    async fn create(params: Json) -> Result<Wallet>;
}

#[enum_dispatch]
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum Wallet {
    Plaintext(wallets::PlaintextWallet),
    Impersonator(wallets::Impersonator),
    Ledger(wallets::LedgerWallet),

    #[cfg(feature = "keystore")]
    JsonKeystore(wallets::JsonKeystoreWallet),

    #[cfg(feature = "hd")]
    #[serde(rename = "HDWallet")]
    HDWallet(wallets::HDWallet),

    #[cfg(feature = "pkey")]
    PrivateKey(wallets::PrivateKeyWallet),
}

impl Wallet {
    pub(crate) async fn create(params: Json) -> Result<Wallet> {
        let wallet_type = params["type"].as_str().unwrap_or_default();

        let wallet = match wallet_type {
            "plaintext" => PlaintextWallet::create(params).await?,

            #[cfg(feature = "keystore")]
            "jsonKeystore" => wallets::JsonKeystoreWallet::create(params).await?,

            #[cfg(feature = "hd")]
            "HDWallet" => wallets::HDWallet::create(params).await?,

            "impersonator" => Impersonator::create(params).await?,
            "ledger" => LedgerWallet::create(params).await?,

            #[cfg(feature = "pkey")]
            "privateKey" => wallets::PrivateKeyWallet::create(params).await?,

            _ => return Err(Error::InvalidWalletType(wallet_type.into())),
        };

        Ok(wallet)
    }
}

#[derive(Debug, PartialEq)]
pub enum WalletType {
    Plaintext,
    JsonKeystore,
    HDWallet,
    Impersonator,
    Ledger,
    PrivateKey,
}

impl std::fmt::Display for WalletType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "{}",
            match self {
                WalletType::Plaintext => "plaintext",
                WalletType::JsonKeystore => "jsonKeystore",
                WalletType::HDWallet => "HDWallet",
                WalletType::Impersonator => "impersonator",
                WalletType::Ledger => "ledger",
                WalletType::PrivateKey => "privateKey",
            }
        )
    }
}

impl From<&Wallet> for WalletType {
    fn from(wallet: &Wallet) -> Self {
        match wallet {
            Wallet::Plaintext(_) => Self::Plaintext,
            Wallet::Impersonator(_) => Self::Impersonator,
            Wallet::Ledger(_) => Self::Ledger,

            #[cfg(feature = "keystore")]
            Wallet::JsonKeystore(_) => Self::JsonKeystore,

            #[cfg(feature = "hd")]
            Wallet::HDWallet(_) => Self::HDWallet,

            #[cfg(feature = "pkey")]
            Wallet::PrivateKey(_) => Self::PrivateKey,
        }
    }
}
