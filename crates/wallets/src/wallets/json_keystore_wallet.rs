use std::{fs::File, io::BufReader, path::PathBuf, str::FromStr, sync::Arc, time::Duration};

use alloy::{
    primitives::B256,
    signers::{Signer as _, local::LocalSigner},
};
use async_trait::async_trait;
use coins_bip32::ecdsa;
use ethui_dialogs::{Dialog, DialogMsg};
use ethui_types::prelude::*;
use secrets::SecretVec;
use tokio::{
    sync::{Mutex, RwLock},
    task::JoinHandle,
};

use crate::{Signer, Wallet, WalletControl, wallet::WalletCreate};

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
pub struct JsonKeystoreWallet {
    name: String,
    pub file: PathBuf,

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

        let secret = self.secret.read().await;
        let secret = secret.as_ref().unwrap().lock().await;

        let mut signer = signer_from_secret(&secret);
        // TODO: use u64 for chain id
        signer.set_chain_id(Some(chain_id));
        Ok(Signer::Local(signer))
    }
}

impl JsonKeystoreWallet {
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
            if let Ok(keystore) = LocalSigner::decrypt_keystore(self.file.clone(), password) {
                self.store_secret(&keystore).await;
                return Ok(());
            }

            dialog.send("failed", None).await?;
        }

        Err(eyre!("user failed to unlock the wallet"))
    }

    async fn store_secret(&self, keystore: &LocalSigner<ecdsa::SigningKey>) {
        // acquire both write locks
        let mut expirer_handle = self.expirer.write().await;
        let mut secret_handle = self.secret.write().await;

        let secret = signer_into_secret(keystore);

        *secret_handle = Some(Mutex::new(secret));

        // set up cache expiration for 1 minute
        let clone = Arc::clone(&self.secret);
        *expirer_handle = Some(tokio::spawn(async move {
            tokio::time::sleep(Duration::from_secs(60)).await;
            clone.write().await.take();
        }));
    }
}

/// Converts a signer into a SecretVec
fn signer_into_secret(keystore: &LocalSigner<ecdsa::SigningKey>) -> SecretVec<u8> {
    // TODO: test this encoding
    let signer_bytes = keystore.credential().to_bytes();
    let bytes = signer_bytes.as_slice();

    SecretVec::new(bytes.len(), |s| {
        (0..bytes.len()).for_each(|i| {
            s[i] = bytes[i];
        });
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
