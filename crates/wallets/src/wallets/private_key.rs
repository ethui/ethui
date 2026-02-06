use std::str::FromStr;

use alloy::signers::{Signer as _, local::PrivateKeySigner};
use async_trait::async_trait;
use ethui_crypto::{self, EncryptedData};
use ethui_types::prelude::*;
use secrets::SecretVec;

use crate::{
    Signer, Wallet, WalletControl,
    secret_cache::{SecretCache, string_into_secret, unlock_with_dialog},
    wallet::WalletCreate,
};

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PrivateKeyWallet {
    name: String,
    address: Address,
    ciphertext: EncryptedData<String>,

    #[serde(skip)]
    cache: SecretCache,
}

#[async_trait]
impl WalletCreate for PrivateKeyWallet {
    async fn create(params: serde_json::Value) -> Result<Wallet> {
        Ok(Wallet::PrivateKey(
            Self::from_params(serde_json::from_value(params)?).await?,
        ))
    }
}

#[async_trait]
impl WalletControl for PrivateKeyWallet {
    fn name(&self) -> String {
        self.name.clone()
    }

    async fn update(mut self, params: serde_json::Value) -> Result<Wallet> {
        if let Some(name) = params["name"].as_str() {
            self.name = name.into();
        }

        Ok(Wallet::PrivateKey(self))
    }

    async fn get_current_address(&self) -> Address {
        self.address
    }

    fn get_current_path(&self) -> String {
        self.address.to_string()
    }

    async fn set_current_path(&mut self, _path: String) -> Result<()> {
        Ok(())
    }

    async fn get_address(&self, _path: &str) -> Result<Address> {
        Ok(self.get_current_address().await)
    }

    async fn get_all_addresses(&self) -> Vec<(String, Address)> {
        vec![(self.get_current_path(), self.get_current_address().await)]
    }

    async fn build_signer(&self, chain_id: u64, _path: &str) -> Result<Signer> {
        self.unlock().await?;

        let guard = self.cache.read().await;
        let secret = guard.as_ref().unwrap().lock().await;

        let mut signer = signer_from_secret(&secret);
        // TODO: use u64 for chain id
        signer.set_chain_id(chain_id.into());
        Ok(Signer::Local(signer))
    }
}

impl PrivateKeyWallet {
    pub async fn from_params(params: PrivateKeyWalletParams) -> Result<Self> {
        let key = params
            .private_key
            .clone()
            .strip_prefix("0x")
            .unwrap_or(&params.private_key)
            .to_string();

        let wallet: PrivateKeySigner = PrivateKeySigner::from_str(&key)?;

        let ciphertext = ethui_crypto::encrypt(&key, &params.password)
            .map_err(|e| eyre!("Failed to encrypt private key: {e}"))?;

        Ok(Self {
            name: params.name,
            address: wallet.address(),
            ciphertext,
            cache: Default::default(),
        })
    }

    async fn unlock(&self) -> Result<()> {
        let ciphertext = self.ciphertext.clone();
        unlock_with_dialog(&self.cache, &self.name, |password| {
            let private_key = ethui_crypto::decrypt(&ciphertext, password)?;
            Ok(string_into_secret(private_key))
        })
        .await
    }
}

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PrivateKeyWalletParams {
    private_key: String,
    password: String,
    name: String,
}

/// Converts a SecretVec into a signer
fn signer_from_secret(secret: &SecretVec<u8>) -> PrivateKeySigner {
    let signer_bytes = secret.borrow();

    // unwraps should be ok here since we know the input format is correctly
    // unless the user messes with wallets.json manually, but that's unlikely
    let key_str = String::from_utf8(signer_bytes.to_vec()).unwrap();
    let key = B256::from_str(&key_str).unwrap();
    PrivateKeySigner::from_bytes(&key).expect("Failed to create signer from bytes")
}
