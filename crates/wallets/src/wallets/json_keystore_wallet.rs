use std::{fs::File, io::BufReader, path::PathBuf, str::FromStr};

use alloy::{
    primitives::B256,
    signers::{Signer as _, local::LocalSigner},
};
use async_trait::async_trait;
use coins_bip32::ecdsa;
use ethui_types::prelude::*;
use secrets::SecretVec;

use crate::{
    Signer, Wallet, WalletControl,
    secret_cache::{SecretCache, unlock_with_dialog},
    wallet::WalletCreate,
};

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
pub struct JsonKeystoreWallet {
    name: String,
    pub file: PathBuf,

    #[serde(skip)]
    cache: SecretCache,
}

#[async_trait]
impl WalletCreate for JsonKeystoreWallet {
    async fn create(params: serde_json::Value) -> color_eyre::Result<Wallet> {
        Ok(Wallet::JsonKeystore(serde_json::from_value(params)?))
    }
}

#[async_trait]
impl WalletControl for JsonKeystoreWallet {
    fn name(&self) -> String {
        self.name.clone()
    }

    async fn update(mut self, params: serde_json::Value) -> color_eyre::Result<Wallet> {
        Ok(Wallet::JsonKeystore(serde_json::from_value(params)?))
    }

    async fn get_current_address(&self) -> Address {
        let file = File::open(self.file.clone()).unwrap();
        let reader = BufReader::new(file);
        let mut res: serde_json::Value = serde_json::from_reader(reader).unwrap();

        // TODO: this should fail correctly
        Address::from_str(res["address"].take().as_str().unwrap()).unwrap()
    }

    fn get_current_path(&self) -> String {
        self.file.to_string_lossy().to_string()
    }

    async fn set_current_path(&mut self, _path: String) -> color_eyre::Result<()> {
        Ok(())
    }

    async fn get_address(&self, _path: &str) -> color_eyre::Result<Address> {
        Ok(self.get_current_address().await)
    }

    async fn get_all_addresses(&self) -> Vec<(String, Address)> {
        vec![("default".into(), self.get_current_address().await)]
    }

    async fn build_signer(&self, chain_id: u64, _path: &str) -> color_eyre::Result<Signer> {
        self.unlock().await?;

        let guard = self.cache.read().await;
        let secret = guard.as_ref().unwrap().lock().await;

        let mut signer = signer_from_secret(&secret);
        // TODO: use u64 for chain id
        signer.set_chain_id(Some(chain_id));
        Ok(Signer::Local(signer))
    }
}

impl JsonKeystoreWallet {
    async fn unlock(&self) -> color_eyre::Result<()> {
        let file = self.file.clone();
        unlock_with_dialog(&self.cache, &self.name, |password| {
            let keystore = LocalSigner::decrypt_keystore(file.clone(), password)?;
            Ok(signer_into_secret(&keystore))
        })
        .await
    }
}

/// Converts a signer into a SecretVec
fn signer_into_secret(keystore: &LocalSigner<ecdsa::SigningKey>) -> SecretVec<u8> {
    // TODO: test this encoding
    let signer_bytes = keystore.credential().to_bytes();
    let bytes = signer_bytes.as_slice();

    SecretVec::new(bytes.len(), |s| {
        s.copy_from_slice(bytes);
    })
}

/// Converts a SecretVec into a signer
fn signer_from_secret(secret: &SecretVec<u8>) -> LocalSigner<ecdsa::SigningKey> {
    let signer_bytes = secret.borrow();
    let key = B256::from_slice(&signer_bytes);
    LocalSigner::from_bytes(&key).unwrap()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn secret() {
        let signer = LocalSigner::random();

        let secret = signer_into_secret(&signer);
        let recovered_signer = signer_from_secret(&secret);

        assert_eq!(signer.address(), recovered_signer.address());
        assert_eq!(signer.credential(), recovered_signer.credential());
    }
}
