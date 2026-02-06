use async_trait::async_trait;
use enum_dispatch::enum_dispatch;
use ethui_types::prelude::*;

use super::wallets::{HDWallet, Impersonator, JsonKeystoreWallet, LedgerWallet, PlaintextWallet};
use crate::wallets::PrivateKeyWallet;

#[async_trait]
#[enum_dispatch(Wallet)]
pub trait WalletControl: Sync + Send + Deserialize<'static> + Serialize + std::fmt::Debug {
    fn name(&self) -> String;
    async fn update(mut self, params: Json) -> Result<Wallet>;
    async fn get_current_address(&self) -> Result<Address>;
    fn get_current_path(&self) -> String;
    async fn set_current_path(&mut self, path: String) -> Result<()>;
    async fn get_all_addresses(&self) -> Result<Vec<(String, Address)>>;

    async fn get_address(&self, path: &str) -> Result<Address>;

    async fn build_signer(&self, chain_id: u64, path: &str) -> Result<crate::signer::Signer>;

    async fn find(&self, address: Address) -> Result<Option<String>> {
        let addresses = self.get_all_addresses().await?;

        Ok(addresses.iter().find_map(|(path, addr)| {
            if *addr == address {
                Some(path.clone())
            } else {
                None
            }
        }))
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
    Plaintext(PlaintextWallet),
    JsonKeystore(JsonKeystoreWallet),

    #[serde(rename = "HDWallet")]
    HDWallet(HDWallet),

    Impersonator(Impersonator),

    Ledger(LedgerWallet),

    PrivateKey(PrivateKeyWallet),
}

impl Wallet {
    pub fn wallet_type(&self) -> &'static str {
        match self {
            Wallet::Plaintext(_) => "Plaintext",
            Wallet::JsonKeystore(_) => "JsonKeystore",
            Wallet::HDWallet(_) => "HDWallet",
            Wallet::Impersonator(_) => "Impersonator",
            Wallet::Ledger(_) => "Ledger",
            Wallet::PrivateKey(_) => "PrivateKey",
        }
    }

    pub(crate) async fn create(params: Json) -> Result<Wallet> {
        let wallet_type = params["type"].as_str().unwrap_or_default();

        let wallet = match wallet_type {
            "plaintext" => PlaintextWallet::create(params).await?,
            "jsonKeystore" => JsonKeystoreWallet::create(params).await?,
            "HDWallet" => HDWallet::create(params).await?,
            "impersonator" => Impersonator::create(params).await?,
            "ledger" => LedgerWallet::create(params).await?,
            "privateKey" => PrivateKeyWallet::create(params).await?,
            _ => return Err(eyre!("invalid wallet type: {}", wallet_type)),
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
            Wallet::JsonKeystore(_) => Self::JsonKeystore,
            Wallet::HDWallet(_) => Self::HDWallet,
            Wallet::Impersonator(_) => Self::Impersonator,
            Wallet::Ledger(_) => Self::Ledger,
            Wallet::PrivateKey(_) => Self::PrivateKey,
        }
    }
}
