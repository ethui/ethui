use std::{sync::Arc, time::Duration};

use alloy::signers::{
    Signer as _,
    local::{MnemonicBuilder, coins_bip39::English},
};
use async_trait::async_trait;
use ethui_crypto::{self, EncryptedData};
use ethui_dialogs::{Dialog, DialogMsg};
use ethui_types::prelude::*;
use secrets::SecretVec;
use tokio::{
    sync::{Mutex, RwLock},
    task::JoinHandle,
};

use crate::{Signer, Wallet, WalletControl, utils, wallet::WalletCreate};

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct HDWallet {
    name: String,
    derivation_path: String,
    count: usize,
    current: (String, Address),
    addresses: Vec<(String, Address)>,
    ciphertext: EncryptedData<String>,

    /// The signer is cached inside a `RwLock` so we can have interior mutability
    /// Since JSON keystore signers are time-consuming to decrypt, we can't do it on-the-fly for
    /// every incoming signing request
    ///
    /// The cache is stored as a
    /// [SecretVec](https://docs.rs/secrets/latest/secrets/struct.SecretVec.html#method.new) for
    /// some in-memory safety guarantees
    ///
    /// The additional Mutex within is there because `SecretVec` is not Send
    #[serde(skip)]
    secret: Arc<RwLock<Option<Mutex<SecretVec<u8>>>>>,

    /// A join handle that will expire the signer after some time
    #[serde(skip)]
    expirer: Arc<RwLock<Option<JoinHandle<()>>>>,
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

        let secret = self.secret.read().await;
        let secret = secret.as_ref().unwrap().lock().await;

        let mnemonic = mnemonic_from_secret(&secret);
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
            secret: Default::default(),
            expirer: Default::default(),
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

        let secret = self.secret.read().await;
        let secret = secret.as_ref().unwrap().lock().await;
        let mnemonic = mnemonic_from_secret(&secret);

        let addresses = utils::derive_addresses(&mnemonic, &self.derivation_path, self.count);
        // TODO check if current address is still part of the list, instead of hardcoding a new current
        let current = addresses.first().unwrap().clone();

        self.current = current;
        self.addresses = addresses;

        Ok(())
    }

    async fn is_unlocked(&self) -> bool {
        let secret = self.secret.read().await;
        secret.is_some()
    }

    async fn unlock(&self) -> color_eyre::Result<()> {
        // if we already have a signer, then we're good
        if self.is_unlocked().await {
            return Ok(());
        }

        // open the dialog
        let dialog = Dialog::new("wallet-unlock", serde_json::to_value(self).unwrap());
        dialog.open().await?;

        // attempt to receive a password at most 3 times
        for _ in 0..3 {
            let password = if let Some(DialogMsg::Data(payload)) = dialog.recv().await {
                let password = payload["password"].clone();
                password
                    .as_str()
                    .with_context(|| "wallet unlock rejected by user".to_string())?
                    .to_string()
            } else {
                return Err(eyre!("wallet unlock rejected by user"));
            };

            // if password was given, and correctly decrypts the keystore
            if let Ok(mnemonic) = ethui_crypto::decrypt(&self.ciphertext, &password) {
                self.store_secret(mnemonic).await;
                return Ok(());
            }

            dialog.send("failed", None).await?;
        }

        Err(eyre!("user failed to unlock the wallet"))
    }

    async fn store_secret(&self, mnemonic: String) {
        // acquire both write locks
        let mut expirer_handle = self.expirer.write().await;
        let mut secret_handle = self.secret.write().await;

        let secret = mnemonic_into_secret(mnemonic);

        *secret_handle = Some(Mutex::new(secret));

        // set up cache expiration for 1 minute
        let clone = Arc::clone(&self.secret);
        *expirer_handle = Some(tokio::spawn(async move {
            tokio::time::sleep(Duration::from_secs(60)).await;
            clone.write().await.take();
        }));
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

/// Converts a signer into a SecretVec
pub fn mnemonic_into_secret(mnemonic: String) -> SecretVec<u8> {
    let signer_bytes = mnemonic.into_bytes();
    let bytes = signer_bytes.as_slice();

    SecretVec::new(bytes.len(), |s| {
        (0..bytes.len()).for_each(|i| {
            s[i] = bytes[i];
        });
    })
}

/// Converts a SecretVec into a signer
pub fn mnemonic_from_secret(secret: &SecretVec<u8>) -> String {
    let signer_bytes = secret.borrow();
    String::from_utf8(signer_bytes.to_vec()).unwrap()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn secret() {
        let signer = "test test test test test test test test test test test junk".to_string();

        let secret = mnemonic_into_secret(signer.clone());
        let recovered_signer = mnemonic_from_secret(&secret);

        assert_eq!(signer, recovered_signer);
    }
}
