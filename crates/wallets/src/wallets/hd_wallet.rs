use alloy::signers::{
    Signer as _,
    local::{MnemonicBuilder, coins_bip39::English},
};
use async_trait::async_trait;
use ethui_crypto::{self, EncryptedData};
use ethui_types::prelude::*;

use crate::{
    Signer, Wallet, WalletControl,
    secret_cache::{SecretCache, string_from_secret, string_into_secret, unlock_with_dialog},
    utils,
    wallet::WalletCreate,
};

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct HDWallet {
    name: String,
    derivation_path: String,
    count: usize,
    current: (String, Address),
    addresses: Vec<(String, Address)>,
    ciphertext: EncryptedData<String>,

    #[serde(skip)]
    cache: SecretCache,
}

#[async_trait]
impl WalletCreate for HDWallet {
    async fn create(params: serde_json::Value) -> color_eyre::Result<Wallet> {
        Ok(Wallet::HDWallet(
            Self::from_params(serde_json::from_value(params)?).await?,
        ))
    }
}

#[async_trait]
impl WalletControl for HDWallet {
    fn name(&self) -> String {
        self.name.clone()
    }

    async fn update(mut self, params: serde_json::Value) -> color_eyre::Result<Wallet> {
        if let Some(name) = params["name"].as_str() {
            self.name = name.into();
        }
        if let Some(path) = params["derivationPath"].as_str() {
            self.update_derivation_path(path.into()).await?;
        }
        if let Some(count) = params["count"].as_u64() {
            self.update_count(count as usize).await?;
        }

        Ok(Wallet::HDWallet(self))
    }

    async fn get_current_address(&self) -> Address {
        self.current.1
    }

    fn get_current_path(&self) -> String {
        self.current.0.clone()
    }

    async fn set_current_path(&mut self, path: String) -> color_eyre::Result<()> {
        self.current = self
            .addresses
            .iter()
            .find(|(p, _)| p == &path)
            .cloned()
            .with_context(|| format!("unknown wallet key: {path}"))?;

        Ok(())
    }

    async fn get_address(&self, path: &str) -> color_eyre::Result<Address> {
        self.addresses
            .iter()
            .find(|(p, _)| p == path)
            .map(|(_, a)| *a)
            .with_context(|| format!("unknown wallet key: {path}"))
    }

    async fn get_all_addresses(&self) -> Vec<(String, Address)> {
        self.addresses.clone()
    }

    async fn build_signer(&self, chain_id: u64, path: &str) -> color_eyre::Result<Signer> {
        if !self.addresses.iter().any(|(p, _)| p == path) {
            return Err(eyre!("unknown wallet key: {}", path));
        }

        self.unlock().await?;

        let guard = self.cache.read().await;
        let secret = guard.as_ref().unwrap().lock().await;

        let mnemonic = string_from_secret(&secret);
        let mut signer = MnemonicBuilder::<English>::default()
            .phrase(mnemonic.as_str())
            .derivation_path(path)?
            .build()?;

        signer.set_chain_id(Some(chain_id));

        Ok(Signer::Local(signer))
    }
}

impl HDWallet {
    pub async fn from_params(params: HDWalletParams) -> color_eyre::Result<Self> {
        let addresses =
            utils::derive_addresses(&params.mnemonic, &params.derivation_path, params.count);
        let current = addresses.first().unwrap().clone();
        let ciphertext = ethui_crypto::encrypt(&params.mnemonic, &params.password).unwrap();

        Ok(Self {
            name: params.name,
            derivation_path: params.derivation_path,
            current,
            count: params.count,
            ciphertext,
            addresses,
            cache: Default::default(),
        })
    }

    async fn update_derivation_path(&mut self, derivation_path: String) -> color_eyre::Result<()> {
        self.derivation_path = derivation_path;

        self.update_derived_addresses().await?;

        Ok(())
    }

    async fn update_count(&mut self, count: usize) -> color_eyre::Result<()> {
        self.count = count;

        self.update_derived_addresses().await?;

        Ok(())
    }

    async fn update_derived_addresses(&mut self) -> color_eyre::Result<()> {
        self.unlock().await?;

        let guard = self.cache.read().await;
        let secret = guard.as_ref().unwrap().lock().await;
        let mnemonic = string_from_secret(&secret);

        let addresses = utils::derive_addresses(&mnemonic, &self.derivation_path, self.count);
        // TODO check if current address is still part of the list, instead of hardcoding a new current
        let current = addresses.first().unwrap().clone();

        self.current = current;
        self.addresses = addresses;

        Ok(())
    }

    async fn unlock(&self) -> color_eyre::Result<()> {
        let ciphertext = self.ciphertext.clone();
        unlock_with_dialog(&self.cache, &self.name, |password| {
            let mnemonic = ethui_crypto::decrypt(&ciphertext, password)?;
            Ok(string_into_secret(mnemonic))
        })
        .await
    }
}

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct HDWalletParams {
    mnemonic: String,
    derivation_path: String,
    password: String,
    name: String,
    count: usize,
}

#[cfg(test)]
mod tests {
    use crate::secret_cache::{string_from_secret, string_into_secret};

    #[test]
    fn secret() {
        let signer = "test test test test test test test test test test test junk".to_string();

        let secret = string_into_secret(signer.clone());
        let recovered_signer = string_from_secret(&secret);

        assert_eq!(signer, recovered_signer);
    }
}
