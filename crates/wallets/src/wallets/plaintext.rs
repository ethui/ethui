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
        let wallet: Self = serde_json::from_value(params)?;
        wallet.check_count()?;

        Ok(Wallet::Plaintext(wallet))
    }
}

#[async_trait]
impl WalletControl for PlaintextWallet {
    fn name(&self) -> String {
        self.name.clone()
    }

    async fn update(mut self, params: serde_json::Value) -> color_eyre::Result<Wallet> {
        let wallet: Self = serde_json::from_value(params)?;
        wallet.check_count()?;

        Ok(Wallet::Plaintext(wallet))
    }

    async fn get_current_address(&self) -> Address {
        self.build_signer(1, &self.current_path)
            .await
            .unwrap()
            .address()
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

    async fn get_all_addresses(&self) -> Vec<(String, Address)> {
        utils::derive_addresses(&self.mnemonic, &self.derivation_path, self.count)
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

impl PlaintextWallet {
    /// A zero count derives no addresses at all, leaving a wallet that lists no
    /// keys. The GUI form rejects it, but every other caller
    /// (`ethui_createWallet`, and the MCP tool on top of it) does not.
    ///
    /// Checked here rather than in `TryFrom<Deserializer>` on purpose: the same
    /// deserializer reads `wallets.json` at boot, where `init` unwraps, so
    /// rejecting there would turn an already-stored bad wallet into a startup
    /// panic.
    fn check_count(&self) -> color_eyre::Result<()> {
        if self.count == 0 {
            return Err(eyre!("count must be at least 1"));
        }

        Ok(())
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

#[cfg(test)]
mod tests {
    use super::*;

    fn params(count: usize) -> Json {
        json!({
            "type": "plaintext",
            "name": "test",
            "mnemonic": "test test test test test test test test test test test junk",
            "derivationPath": "m/44'/60'/0'/0",
            "count": count,
        })
    }

    /// A wallet that derives no addresses is not a wallet. Without this, a
    /// `count` of 0 deserializes fine and the wallet is persisted with an empty
    /// key list.
    #[tokio::test]
    async fn a_zero_count_is_rejected() {
        let err = PlaintextWallet::create(params(0)).await.unwrap_err();

        assert!(
            err.to_string().contains("count must be at least 1"),
            "expected a count error, got {err}"
        );
    }

    /// The counterpart to the check living in `create` rather than in the
    /// deserializer: `init` unwraps when reading `wallets.json`, so a wallet
    /// already stored with a zero count has to keep loading.
    #[test]
    fn a_stored_zero_count_wallet_still_deserializes() {
        let wallet: PlaintextWallet = serde_json::from_value(params(0)).unwrap();

        assert_eq!(wallet.count, 0);
    }

    #[tokio::test]
    async fn a_positive_count_derives_that_many_addresses() {
        let wallet = PlaintextWallet::create(params(3)).await.unwrap();

        assert_eq!(wallet.get_all_addresses().await.len(), 3);
    }
}
