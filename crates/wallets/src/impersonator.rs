use std::str::FromStr;

use async_trait::async_trait;
use ethers::core::k256::ecdsa::SigningKey;
use iron_types::ChecksummedAddress;
use serde::{Deserialize, Serialize};

use crate::{wallet::WalletCreate, Result, Wallet, WalletControl};

#[derive(Default, Debug, Clone, Serialize, Deserialize)]
pub struct Impersonator {
    pub name: String,
    pub current: usize,
    pub addresses: Vec<ChecksummedAddress>,
}

#[async_trait]
impl WalletCreate for Impersonator {
    async fn create(params: serde_json::Value) -> Result<Wallet> {
        // TODO: make sure current is within the array
        Ok(Wallet::Impersonator(serde_json::from_value(params)?))
    }
}

#[async_trait]
impl WalletControl for Impersonator {
    fn name(&self) -> String {
        self.name.clone()
    }

    async fn update(mut self, params: serde_json::Value) -> Result<Wallet> {
        if let Some(name) = params["name"].as_str() {
            self.name = name.into();
        }

        if !params["addresses"].is_null() {
            self.addresses = serde_json::from_value(params["addresses"].clone())?;
        }

        if let Some(current) = params["current"].as_u64() {
            self.current = current as usize;
        }

        // TODO: make sure current is within the array

        Ok(Wallet::Impersonator(self))
    }

    async fn get_current_address(&self) -> ChecksummedAddress {
        self.addresses[self.current].clone()
    }

    async fn set_current_path(&mut self, path: String) -> Result<()> {
        self.current = usize::from_str(&path)?;
        Ok(())
    }

    async fn get_all_addresses(&self) -> Vec<(String, ChecksummedAddress)> {
        self.addresses
            .iter()
            .map(|v| (v.to_string(), v.clone()))
            .collect()
    }

    async fn build_signer(&self, _chain_id: u32) -> Result<ethers::signers::Wallet<SigningKey>> {
        Err(crate::Error::WalletCantSign)
    }
}
