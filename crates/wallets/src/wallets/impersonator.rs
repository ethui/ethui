use async_trait::async_trait;
use ethui_types::prelude::*;

use crate::{Signer, Wallet, WalletControl, wallet::WalletCreate};

#[derive(Default, Debug, Clone, Serialize, Deserialize)]
pub struct Impersonator {
    pub name: String,
    pub addresses: Vec<Address>,

    #[serde(default)]
    pub current: usize,
}

#[async_trait]
impl WalletCreate for Impersonator {
    async fn create(params: serde_json::Value) -> color_eyre::Result<Wallet> {
        // TODO: make sure current is within the array
        Ok(Wallet::Impersonator(serde_json::from_value(params)?))
    }
}

#[async_trait]
impl WalletControl for Impersonator {
    fn name(&self) -> String {
        self.name.clone()
    }

    async fn update(mut self, params: serde_json::Value) -> color_eyre::Result<Wallet> {
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

    async fn get_current_address(&self) -> Address {
        self.addresses[self.current]
    }

    fn get_current_path(&self) -> String {
        self.current.to_string()
    }

    async fn set_current_path(&mut self, path: String) -> color_eyre::Result<()> {
        self.current = usize::from_str(&path)?;
        Ok(())
    }

    async fn get_all_addresses(&self) -> Vec<(String, Address)> {
        self.addresses
            .iter()
            .enumerate()
            .map(|(i, v)| (i.to_string(), *v))
            .collect()
    }

    async fn get_address(&self, path: &str) -> color_eyre::Result<Address> {
        Ok(self.addresses[usize::from_str(path)?])
    }

    fn is_dev(&self) -> bool {
        true
    }

    async fn build_signer(&self, _chain_id: u64, _path: &str) -> color_eyre::Result<Signer> {
        Err(eyre!("This wallet type cannot sign"))
    }
}
