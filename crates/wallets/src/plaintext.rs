use std::str::FromStr;

use async_trait::async_trait;
use coins_bip32::path::DerivationPath;
use ethers::{
    core::k256::ecdsa::SigningKey,
    signers::{coins_bip39::English, MnemonicBuilder, Signer},
};
use iron_types::{Address, ToAlloy};
use serde::{Deserialize, Serialize};

use super::{utils, wallet::WalletCreate, Result, Wallet, WalletControl};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(try_from = "Deserializer", rename_all = "camelCase")]
pub struct PlaintextWallet {
    name: String,
    mnemonic: String,
    derivation_path: String,
    count: u32,
    current_path: String,
}

#[async_trait]
impl WalletCreate for PlaintextWallet {
    async fn create(params: serde_json::Value) -> Result<Wallet> {
        Ok(Wallet::Plaintext(serde_json::from_value(params)?))
    }
}

#[async_trait]
impl WalletControl for PlaintextWallet {
    fn name(&self) -> String {
        self.name.clone()
    }

    async fn update(mut self, params: serde_json::Value) -> Result<Wallet> {
        Ok(Wallet::Plaintext(serde_json::from_value(params)?))
    }

    async fn get_current_address(&self) -> Address {
        self.build_current_signer(1)
            .await
            .unwrap()
            .address()
            .to_alloy()
    }

    fn get_current_path(&self) -> String {
        self.current_path.clone()
    }

    async fn set_current_path(&mut self, path: String) -> Result<()> {
        let builder = MnemonicBuilder::<English>::default().phrase(self.mnemonic.as_str());

        match utils::derive_from_builder_and_path(builder, &path) {
            Ok(_) => {
                self.current_path = path;
                Ok(())
            }
            Err(e) => Err(e),
        }
    }

    async fn get_address(&self, path: &str) -> Result<Address> {
        Ok(self.build_signer(1, path).await?.address().to_alloy())
    }

    async fn build_signer(
        &self,
        chain_id: u32,
        path: &str,
    ) -> Result<ethers::signers::Wallet<SigningKey>> {
        Ok(MnemonicBuilder::<English>::default()
            .phrase(self.mnemonic.as_ref())
            .derivation_path(path)?
            .build()
            .map(|v| v.with_chain_id(chain_id))?)
    }

    async fn get_all_addresses(&self) -> Vec<(String, Address)> {
        utils::derive_addresses(&self.mnemonic, &self.derivation_path, self.count)
    }

    fn is_dev(&self) -> bool {
        true
    }
}

impl Default for PlaintextWallet {
    fn default() -> Self {
        let mnemonic = String::from("test test test test test test test test test test test junk");
        let derivation_path = String::from("m/44'/60'/0'/0");
        let current_path = format!("{}/{}", derivation_path, 0);

        Self {
            name: "test".into(),
            mnemonic,
            derivation_path,
            count: 3,
            current_path,
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Deserializer {
    name: String,
    mnemonic: String,
    derivation_path: String,
    count: u32,
    current_path: Option<String>,
}

/// Deserializes a wallet with some additional_checks ensuring derivation_paths are valid
impl TryFrom<Deserializer> for PlaintextWallet {
    type Error = coins_bip32::Bip32Error;

    fn try_from(value: Deserializer) -> std::result::Result<Self, Self::Error> {
        // try using given current_path
        let current_path: Option<DerivationPath> = match value.current_path {
            Some(path) => DerivationPath::from_str(&path).ok(),
            None => None,
        };

        // if current_path is not given or invalid, try to build it from derivation_path
        let current_path: DerivationPath = match current_path {
            Some(path) => path,
            None => DerivationPath::from_str(&format!("{}/0", value.derivation_path))?,
        };

        Ok(Self {
            name: value.name,
            mnemonic: value.mnemonic,
            derivation_path: value.derivation_path,
            count: value.count,
            current_path: current_path.derivation_string(),
        })
    }
}
