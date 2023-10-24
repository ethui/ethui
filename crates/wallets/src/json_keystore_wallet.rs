use std::{fs::File, io::BufReader, path::PathBuf, str::FromStr, sync::Arc, time::Duration};

use async_trait::async_trait;
use ethers::{
    core::{k256::ecdsa::SigningKey, types::Address},
    signers::{self, Signer},
};
use iron_dialogs::{Dialog, DialogMsg};
use iron_types::ChecksummedAddress;
use secrets::SecretVec;
use tokio::{
    sync::{Mutex, RwLock},
    task::JoinHandle,
};

use super::{wallet::WalletCreate, Error, Result, Wallet, WalletControl};

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
    async fn create(params: serde_json::Value) -> Result<Wallet> {
        Ok(Wallet::JsonKeystore(serde_json::from_value(params)?))
    }
}

#[async_trait]
impl WalletControl for JsonKeystoreWallet {
    fn name(&self) -> String {
        self.name.clone()
    }

    async fn update(mut self, params: serde_json::Value) -> Result<Wallet> {
        Ok(Wallet::JsonKeystore(serde_json::from_value(params)?))
    }

    async fn get_current_address(&self) -> ChecksummedAddress {
        let file = File::open(self.file.clone()).unwrap();
        let reader = BufReader::new(file);
        let mut res: serde_json::Value = serde_json::from_reader(reader).unwrap();

        // TODO: this should fail correctly
        let address: Address = Address::from_str(res["address"].take().as_str().unwrap()).unwrap();

        address.into()
    }

    fn get_current_path(&self) -> String {
        self.file.to_string_lossy().to_string()
    }

    async fn set_current_path(&mut self, _path: String) -> Result<()> {
        Ok(())
    }

    async fn get_address(&self, _path: &str) -> Result<ChecksummedAddress> {
        Ok(self.get_current_address().await)
    }

    async fn build_signer(
        &self,
        chain_id: u32,
        _path: &str,
    ) -> Result<signers::Wallet<SigningKey>> {
        self.unlock().await?;

        let secret = self.secret.read().await;
        let secret = secret.as_ref().unwrap().lock().await;

        let signer = signer_from_secret(&secret);
        Ok(signer.with_chain_id(chain_id))
    }

    async fn get_all_addresses(&self) -> Vec<(String, ChecksummedAddress)> {
        vec![("default".into(), self.get_current_address().await)]
    }
}

impl JsonKeystoreWallet {
    async fn is_unlocked(&self) -> bool {
        let secret = self.secret.read().await;
        secret.is_some()
    }

    async fn unlock(&self) -> Result<()> {
        // if we already have a signer, then we're good
        if self.is_unlocked().await {
            return Ok(());
        }

        // open the dialog
        let dialog = Dialog::new("wallet-unlock", serde_json::to_value(self).unwrap());
        dialog.open().await?;

        // attempt to receive a password at most 3 times
        for _ in 0..3 {
            let password = match dialog.recv().await {
                Some(DialogMsg::Data(payload)) | Some(DialogMsg::Accept(payload)) => {
                    let password = payload["password"].clone();
                    password
                        .as_str()
                        .ok_or(Error::UnlockDialogRejected)?
                        .to_string()
                }
                _ => return Err(Error::UnlockDialogRejected),
            };

            // if password was given, and correctly decrypts the keystore
            if let Ok(keystore) = signers::Wallet::decrypt_keystore(self.file.clone(), password) {
                self.store_secret(&keystore).await;
                dialog.close().await?;
                return Ok(());
            }

            dialog.send("failed", None).await?;
        }

        dialog.close().await?;
        Err(Error::UnlockDialogFailed)
    }

    async fn store_secret(&self, keystore: &signers::Wallet<SigningKey>) {
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
fn signer_into_secret(keystore: &signers::Wallet<SigningKey>) -> SecretVec<u8> {
    let signer_bytes = keystore.signer().to_bytes();
    let bytes = signer_bytes.as_slice();

    SecretVec::new(bytes.len(), |s| {
        (0..bytes.len()).for_each(|i| {
            s[i] = bytes[i];
        });
    })
}

/// Converts a SecretVec into a signer
fn signer_from_secret(secret: &SecretVec<u8>) -> signers::Wallet<SigningKey> {
    let signer_bytes = secret.borrow();
    signers::Wallet::from_bytes(&signer_bytes).unwrap()
}
