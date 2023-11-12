use async_trait::async_trait;
use enum_dispatch::enum_dispatch;

use iron_types::{Address, Json};
use serde::{Deserialize, Serialize};

use super::{
    wallets::{HDWallet, Impersonator, JsonKeystoreWallet, PlaintextWallet},
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

    // async fn build_current_signer(
    //     &self,
    //     chain_id: u32,
    // ) -> Result<ethers::signers::Wallet<SigningKey>> {
    //     self.build_signer(chain_id, &self.get_current_path()).await
    // }

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

#[async_trait]
pub trait WalletSigner {
    type Signer: ethers::signers::Signer;

    async fn build_signer(&self, chain_id: u32, path: &str) -> Result<Self::Signer>;
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
            "impersonator" => Impersonator::create(params).await?,
            _ => return Err(Error::InvalidWalletType(wallet_type.into())),
        };

        Ok(wallet)
    }
}
