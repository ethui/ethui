use async_trait::async_trait;
use coins_bip32::prelude::SigningKey;
use iron_types::{Address, Json};
use serde::{Deserialize, Serialize};

use super::{Result, Wallet, WalletControl, WalletCreate};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Ledger {
    name: String,
    derivation_path: String,
    count: u32,
    current: (String, Address),
}

#[async_trait]
impl WalletCreate for Ledger {
    async fn create(params: serde_json::Value) -> Result<Wallet> {
        Ok(Wallet::Ledger(
            Self::from_params(serde_json::from_value(params)?).await?,
        ))
    }
}
#[async_trait]
impl WalletControl for Ledger {
    fn name(&self) -> String {
        todo!()
    }
    async fn update(mut self, params: Json) -> Result<Wallet> {
        todo!()
    }
    async fn get_current_address(&self) -> Address {
        todo!()
    }
    fn get_current_path(&self) -> String {
        todo!()
    }
    async fn set_current_path(&mut self, path: String) -> Result<()> {
        todo!()
    }
    async fn get_all_addresses(&self) -> Vec<(String, Address)> {
        todo!()
    }
    async fn get_address(&self, path: &str) -> Result<Address> {
        todo!()
    }
    async fn build_signer(
        &self,
        chain_id: u32,
        path: &str,
    ) -> Result<ethers::signers::Wallet<SigningKey>> {
        todo!()
    }
}

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LedgerParams {
    name: String,
    derivation_path: String,
    count: u32,
    current: (String, Address),
}

impl Ledger {
    async fn from_params(params: LedgerParams) -> Result<Self> {}
}
