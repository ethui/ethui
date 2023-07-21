use async_trait::async_trait;
use enum_dispatch::enum_dispatch;
use ethers::core::k256::ecdsa::SigningKey;
use iron_types::{ChecksummedAddress, Json};
use serde::{Deserialize, Serialize};

use crate::{
    hd_wallet::HDWallet, impersonator::Impersonator, Error, JsonKeystoreWallet, PlaintextWallet,
    Result,
};

#[async_trait]
#[enum_dispatch(Wallet)]
pub trait WalletControl: Sync + Send + Deserialize<'static> + Serialize + std::fmt::Debug {
    fn name(&self) -> String;
    async fn update(mut self, params: Json) -> Result<Wallet>;
    async fn get_current_address(&self) -> ChecksummedAddress;
    async fn set_current_path(&mut self, path: String) -> Result<()>;
    async fn get_all_addresses(&self) -> Vec<(String, ChecksummedAddress)>;
    async fn build_signer(&self, chain_id: u32) -> Result<ethers::signers::Wallet<SigningKey>>;

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
}

#[async_trait]
impl WalletCreate for Wallet {
    async fn create(params: Json) -> Result<Wallet> {
        let wallet_type = params["type"].as_str().unwrap_or_default();

        let wallet = match wallet_type {
            "plaintext" => PlaintextWallet::create(params).await?,
            "jsonKeystore" => JsonKeystoreWallet::create(params).await?,
            "HDWallet" => HDWallet::create(params).await?,
            _ => return Err(Error::InvalidWalletType(wallet_type.into())),
        };

        Ok(wallet)
    }
}
