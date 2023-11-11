use async_trait::async_trait;
use coins_bip32::prelude::SigningKey;
use ethers::signers::HDPath;
use iron_types::{Address, Json, ToAlloy};
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use tokio::sync::Mutex;

use crate::Error;

use super::{Result, Wallet, WalletControl};

/// Since all HID devices are accessed through the same interface, we need to globally block it to
/// avoid conflicting aynchronous calls
static HID_MUTEX: Lazy<Mutex<()>> = Lazy::new(Default::default);

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Ledger {
    name: String,
    addresses: Vec<(String, Address)>,
    current: usize,
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
    derivation_paths: Vec<String>,
}

impl Ledger {
    pub(crate) async fn create(params: serde_json::Value) -> Result<Wallet> {
        let params = serde_json::from_value(params)?;
        Ok(Wallet::Ledger(Self::from_params(params).await?))
    }

    pub(crate) async fn detect(paths: Vec<String>) -> Result<Vec<(String, Address)>> {
        let mut res = vec![];
        // let _guard = HID_MUTEX.lock().await;
        // for path in paths.iter() {
        let fut = crate::ledger_app::LedgerEthereum::new(HDPath::Other(paths[0].clone()), 1);
        tokio::pin!(fut);

        // let mut fut = fut.lock().unwrap();
        let ledger = fut.await.map_err(|e| Error::Ledger(e.to_string()))?;
        let address = ledger
            .get_address()
            .await
            .map_err(|e| Error::Ledger(e.to_string()))?
            .to_alloy();

        res.push((paths[0].clone(), address));
        // }

        Ok(res)
    }

    pub async fn from_params(params: LedgerParams) -> Result<Self> {
        Ok(Self {
            name: params.name,
            addresses: Self::detect(params.derivation_paths).await?,
            current: 0,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn detect() {
        let addresses = Ledger::detect(vec!["m/44'/60'/0'/0/0".to_string()]).await;

        assert!(addresses.is_ok());
    }

    #[tokio::test]
    async fn instantiate_ledger() {
        let ledger = Ledger::from_params(LedgerParams {
            name: "asd".into(),
            derivation_paths: vec!["m/44'/60'/0'/0/0".into()],
        })
        .await;

        assert!(ledger.is_ok());
    }
}
