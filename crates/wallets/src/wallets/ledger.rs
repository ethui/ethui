use alloy::signers::ledger::{HDPath, LedgerSigner};
use async_trait::async_trait;
use ethui_types::prelude::*;

use crate::{Signer, Wallet, WalletControl, utils, wallet::WalletCreate};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LedgerWallet {
    name: String,
    addresses: Vec<(String, Address)>,
    current: usize,
}

#[async_trait]
impl WalletCreate for LedgerWallet {
    async fn create(params: serde_json::Value) -> color_eyre::Result<Wallet> {
        let params = serde_json::from_value(params)?;
        Ok(Wallet::Ledger(Self::from_params(params).await?))
    }
}

#[async_trait]
impl WalletControl for LedgerWallet {
    fn name(&self) -> String {
        self.name.clone()
    }

    async fn update(mut self, params: Json) -> color_eyre::Result<Wallet> {
        if let Some(name) = params["name"].as_str() {
            self.name = name.into();
        }

        if params["paths"].as_array().is_some() {
            let paths: Vec<String> = serde_json::from_value(params["paths"].clone())?;
            let addresses = utils::ledger_derive_multiple(paths).await?;
            self.addresses = addresses;
        }

        if self.current >= self.addresses.len() {
            self.current = 0;
        }

        Ok(Wallet::Ledger(self))
    }

    async fn get_current_address(&self) -> Address {
        self.addresses.get(self.current).unwrap().1
    }

    fn get_current_path(&self) -> String {
        self.addresses.get(self.current).unwrap().0.clone()
    }

    async fn set_current_path(&mut self, path: String) -> color_eyre::Result<()> {
        self.current = self
            .addresses
            .iter()
            .position(|(p, _)| p == &path)
            .with_context(|| format!("unknown wallet key: {path}"))?;

        Ok(())
    }

    async fn get_all_addresses(&self) -> Vec<(String, Address)> {
        self.addresses.clone()
    }

    async fn get_address(&self, path: &str) -> color_eyre::Result<Address> {
        self.addresses
            .iter()
            .find(|(p, _)| p == path)
            .map(|(_, a)| *a)
            .with_context(|| format!("unknown wallet key: {path}"))
    }

    async fn build_signer(&self, chain_id: u64, path: &str) -> color_eyre::Result<Signer> {
        let ledger = LedgerSigner::new(HDPath::Other(path.into()), Some(chain_id))
            .await
            .map_err(|e| eyre!("Ledger error: {}", e))?;

        Ok(Signer::Ledger(ledger))
    }
}

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LedgerParams {
    name: String,
    paths: Vec<String>,
}

impl LedgerWallet {
    pub async fn from_params(params: LedgerParams) -> color_eyre::Result<Self> {
        let addresses = utils::ledger_derive_multiple(params.paths).await?;

        Ok(Self {
            name: params.name,
            addresses,
            current: 0,
        })
    }
}
