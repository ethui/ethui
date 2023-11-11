use async_trait::async_trait;
use coins_bip32::prelude::SigningKey;
use ethers::signers::HDPath;
use iron_types::{Address, Json, ToAlloy};
use serde::{Deserialize, Serialize};

use crate::Error;

use super::{wallet::WalletCreate, Result, Wallet, WalletControl};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Ledger {
    name: String,
    addresses: Vec<(String, Address)>,
    current: usize,
}

#[async_trait]
impl WalletCreate for Ledger {
    async fn create(params: serde_json::Value) -> Result<Wallet> {
        let params = serde_json::from_value(params)?;
        Ok(Wallet::Ledger(Self::from_params(params).await?))
    }
}

#[async_trait]
impl WalletControl for Ledger {
    fn name(&self) -> String {
        self.name.clone()
    }

    async fn update(mut self, params: Json) -> Result<Wallet> {
        if let Some(name) = params["name"].as_str() {
            self.name = name.into();
        }

        // TODO: ability to update other fields

        Ok(Wallet::Ledger(self))
    }

    async fn get_current_address(&self) -> Address {
        self.addresses.get(self.current).unwrap().1
    }

    fn get_current_path(&self) -> String {
        self.addresses.get(self.current).unwrap().0.clone()
    }

    async fn set_current_path(&mut self, path: String) -> Result<()> {
        self.current = self
            .addresses
            .iter()
            .position(|(p, _)| p == &path)
            .ok_or(Error::InvalidKey(path))?;

        Ok(())
    }

    async fn get_all_addresses(&self) -> Vec<(String, Address)> {
        self.addresses.clone()
    }

    async fn get_address(&self, path: &str) -> Result<Address> {
        self.addresses
            .iter()
            .find(|(p, _)| p == path)
            .map(|(_, a)| *a)
            .ok_or(Error::InvalidKey(path.into()))
    }

    async fn build_signer(
        &self,
        _chain_id: u32,
        _path: &str,
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
}

impl Ledger {
    pub async fn detect(derivation_path: String, count: u32) -> Result<Vec<(String, Address)>> {
        let mut res = vec![];
        // let _guard = HID_MUTEX.lock().await;
        for idx in 0..count {
            let path = format!("{}/{}", derivation_path, idx);

            let ledger = ethers::signers::Ledger::new(HDPath::Other(path.clone()), 1)
                .await
                .map_err(|e| Error::Ledger(e.to_string()))?;
            let address = ledger
                .get_address()
                .await
                .map_err(|e| Error::Ledger(e.to_string()))?
                .to_alloy();

            res.push((path, address));
        }

        Ok(res)
    }

    pub async fn from_params(params: LedgerParams) -> Result<Self> {
        let addresses = Self::detect(params.derivation_path, params.count).await?;

        Ok(Self {
            name: params.name,
            addresses,
            current: 0,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn detect() {
        let addresses = Ledger::detect("m/44'/60'/0'/0".to_string(), 1).await;

        assert!(addresses.is_ok());
    }

    #[tokio::test]
    async fn instantiate_ledger() {
        let ledger = Ledger::from_params(LedgerParams {
            name: "asd".into(),
            derivation_path: "m/44'/60'/0'/0".into(),
            count: 1,
        })
        .await;

        assert!(ledger.is_ok());
    }
}
