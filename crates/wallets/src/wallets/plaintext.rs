use alloy::signers::{
    Signer as _,
    local::{MnemonicBuilder, coins_bip39::English},
};
use async_trait::async_trait;
use coins_bip32::path::DerivationPath;
use ethui_types::prelude::*;

use crate::{Signer, Wallet, WalletControl, utils, wallet::WalletCreate};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(try_from = "Deserializer", rename_all = "camelCase")]
pub struct PlaintextWallet {
    name: String,
    mnemonic: String,
    derivation_path: String,
    count: usize,
    current_path: String,
}

#[async_trait]
impl WalletCreate for PlaintextWallet {
    async fn create(params: serde_json::Value) -> color_eyre::Result<Wallet> {
        Ok(Wallet::Plaintext(serde_json::from_value(params)?))
    }
}

#[async_trait]
impl WalletControl for PlaintextWallet {
    fn name(&self) -> String {
        self.name.clone()
    }

    async fn update(mut self, params: serde_json::Value) -> color_eyre::Result<Wallet> {
        Ok(Wallet::Plaintext(serde_json::from_value(params)?))
    }

    async fn get_current_address(&self) -> color_eyre::Result<Address> {
        Ok(self.build_signer(1, &self.current_path).await?.address())
    }

    fn get_current_path(&self) -> String {
        self.current_path.clone()
    }

    async fn set_current_path(&mut self, path: String) -> color_eyre::Result<()> {
        let builder = MnemonicBuilder::<English>::default().phrase(self.mnemonic.as_str());

        match utils::derive_from_builder_and_path(builder, &path) {
            Ok(_) => {
                self.current_path = path;
                Ok(())
            }
            Err(e) => Err(e),
        }
    }

    async fn get_address(&self, path: &str) -> color_eyre::Result<Address> {
        Ok(self.build_signer(1, path).await?.address())
    }

    async fn get_all_addresses(&self) -> color_eyre::Result<Vec<(String, Address)>> {
        Ok(utils::derive_addresses(
            &self.mnemonic,
            &self.derivation_path,
            self.count,
        ))
    }

    fn is_dev(&self) -> bool {
        true
    }

    async fn build_signer(&self, chain_id: u64, path: &str) -> color_eyre::Result<Signer> {
        let signer = MnemonicBuilder::<English>::default()
            .phrase(&self.mnemonic)
            .derivation_path(path)?
            .build()
            .map(|mut v| {
                v.set_chain_id(Some(chain_id));
                v
            })?;

        Ok(Signer::Local(signer))
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
    count: usize,
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
