use std::{path::PathBuf, str::FromStr};

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

#[derive(Debug, serde::Serialize, Clone)]
pub struct JsonKeystoreWallet {
    name: String,
    pub file: PathBuf,
    address: Address,

    #[serde(skip)]
    cache: SecretCache,
}

/// Wallets persisted before `address` was added to this struct don't have it in
/// storage. Rather than panic on load (breaking every existing JSON keystore
/// wallet), fall back to the legacy lookup of the keystore file's own
/// (non-standard, optional) `address` field.
impl<'de> serde::Deserialize<'de> for JsonKeystoreWallet {
    fn deserialize<D>(deserializer: D) -> std::result::Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        #[derive(serde::Deserialize)]
        struct Raw {
            name: String,
            file: PathBuf,
            #[serde(default)]
            address: Option<Address>,
        }

        let raw = Raw::deserialize(deserializer)?;
        let address = raw
            .address
            .or_else(|| legacy_file_address(&raw.file))
            .unwrap_or_default();

        Ok(Self {
            name: raw.name,
            file: raw.file,
            address,
            cache: Default::default(),
        })
    }
}

fn legacy_file_address(file: &std::path::Path) -> Option<Address> {
    let file = std::fs::File::open(file).ok()?;
    let json: serde_json::Value = serde_json::from_reader(std::io::BufReader::new(file)).ok()?;
    Address::from_str(json["address"].as_str()?).ok()
}

/// The keystore's own `address` field is a non-standard, optional extension
/// (e.g. omitted by `cast wallet new`), so the address is derived once at
/// import time by decrypting the file, rather than trusted from the JSON.
#[derive(Debug, serde::Deserialize)]
struct JsonKeystoreWalletParams {
    name: String,
    file: PathBuf,
    password: String,
}

#[async_trait]
impl WalletCreate for JsonKeystoreWallet {
    async fn create(params: serde_json::Value) -> color_eyre::Result<Wallet> {
        let params: JsonKeystoreWalletParams = serde_json::from_value(params)?;
        let keystore = LocalSigner::decrypt_keystore(&params.file, &params.password)?;

        Ok(Wallet::JsonKeystore(Self {
            name: params.name,
            address: keystore.address(),
            file: params.file,
            cache: Default::default(),
        }))
    }
}

#[async_trait]
impl WalletControl for JsonKeystoreWallet {
    fn name(&self) -> String {
        self.name.clone()
    }

    async fn update(mut self, params: serde_json::Value) -> color_eyre::Result<Wallet> {
        if let Some(name) = params["name"].as_str() {
            self.name = name.into();
        }

        Ok(Wallet::JsonKeystore(self))
    }

    async fn get_current_address(&self) -> Address {
        self.address
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

        let guard = self.cache.read().await?;
        let secret = guard.lock().await;

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
    use std::str::FromStr;

    use super::*;

    #[test]
    fn secret() {
        let signer = LocalSigner::random();

        let secret = signer_into_secret(&signer);
        let recovered_signer = signer_from_secret(&secret);

        assert_eq!(signer.address(), recovered_signer.address());
        assert_eq!(signer.credential(), recovered_signer.credential());
    }

    /// Regression test for https://github.com/ethui/ethui/issues/823:
    /// `cast wallet new` keystores omit the (non-standard) `address` field.
    #[test]
    fn create_derives_address_from_keystore_without_address_field() {
        let dir = tempfile::tempdir().unwrap();
        let file = dir.path().join("keystore.json");
        std::fs::write(
            &file,
            r#"{"crypto":{"cipher":"aes-128-ctr","cipherparams":{"iv":"9ac58c41f3cfb68fb8ed629e93f22d28"},"ciphertext":"3e355b65148cb1cc194207a25436038d920faf25a6c5cfb9ba8d914d57253f23","kdf":"scrypt","kdfparams":{"dklen":32,"n":8192,"p":1,"r":8,"salt":"e52897a58091613e00db586696f35a68c833e470d9dd55bb1170e0ea0cce82d2"},"mac":"ad7da2792c9b73ee96ffe31bba7f6ca999074b600f62d49eff840d1bf67bbfae"},"id":"c29a7096-a490-40db-b75e-2512647a4496","version":3}"#,
        )
        .unwrap();

        let params = serde_json::json!({
            "name": "test",
            "file": file,
            "password": "test123",
        });

        let wallet = tokio::runtime::Runtime::new()
            .unwrap()
            .block_on(JsonKeystoreWallet::create(params))
            .unwrap();
        let Wallet::JsonKeystore(wallet) = wallet else {
            panic!("expected a JsonKeystore wallet");
        };

        assert_eq!(
            wallet.address,
            Address::from_str("0xe27952879c504b1c8e9fF34aB53Fa0d3c08C47B9").unwrap()
        );
    }

    /// Wallets persisted before `address` was added to the struct must still
    /// deserialize instead of panicking `wallets.json` load for existing users.
    #[test]
    fn deserializes_legacy_wallet_without_persisted_address() {
        let dir = tempfile::tempdir().unwrap();
        let file = dir.path().join("keystore.json");
        std::fs::write(
            &file,
            r#"{"address":"e27952879c504b1c8e9fF34aB53Fa0d3c08C47B9","crypto":{}}"#,
        )
        .unwrap();

        let persisted = serde_json::json!({
            "name": "legacy",
            "file": file,
        });

        let wallet: JsonKeystoreWallet = serde_json::from_value(persisted).unwrap();

        assert_eq!(
            wallet.address,
            Address::from_str("0xe27952879c504b1c8e9fF34aB53Fa0d3c08C47B9").unwrap()
        );
    }
}
