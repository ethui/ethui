use async_trait::async_trait;
use coins_bip32::prelude::SigningKey;
use ethers::signers::HDPath;
use iron_types::{Address, Json, ToAlloy};
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use tokio::sync::Mutex;

use crate::Error;

use super::{wallet::WalletCreate, Result, Wallet, WalletControl};

/// Since all HID devices are accessed through the same interface, we need to block on it to avoid
/// conflicting aynchronous calls
static HID_MUTEX: Lazy<Mutex<()>> = Lazy::new(Default::default);

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
        tokio::runtime::Handle::current().block_on(async {
            let params = serde_json::from_value(params)?;
            Ok(Wallet::Ledger(Self::from_params(params).await?))
        })
    }
}

#[async_trait]
impl WalletControl for Ledger {
    fn name(&self) -> String {
        todo!()
    }
    async fn update(mut self, _params: Json) -> Result<Wallet> {
        todo!()
    }
    async fn get_current_address(&self) -> Address {
        todo!()
    }
    fn get_current_path(&self) -> String {
        todo!()
    }
    async fn set_current_path(&mut self, _path: String) -> Result<()> {
        todo!()
    }
    async fn get_all_addresses(&self) -> Vec<(String, Address)> {
        todo!()
    }
    async fn get_address(&self, _path: &str) -> Result<Address> {
        todo!()
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
        let _guard = HID_MUTEX.lock().await;
        for idx in 0..count {
            let path = format!("{}/{}", derivation_path, idx);
            let ledger = dbg!(ethers::signers::Ledger::new(HDPath::Other(path.clone()), 1).await)
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

        dbg!(&ledger);
        assert!(ledger.is_ok());
    }
}
