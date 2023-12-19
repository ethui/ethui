use std::{sync::Arc, time::Duration};

use async_trait::async_trait;
use coins_bip32::prelude::SigningKey;
use ethers::signers;
use ethers::signers::Signer as _;
use iron_crypto::{self, EncryptedData};
use iron_dialogs::{Dialog, DialogMsg};
use iron_types::{Address, ToAlloy};
use secrets::SecretVec;
use tokio::{
    sync::{Mutex, RwLock},
    task::JoinHandle,
};

use crate::{wallet::WalletCreate, Error, Result, Signer, Wallet, WalletControl};

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PrivateKeyWallet {
    name: String,
    address: Address,
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

    async fn build_signer(&self, chain_id: u32, _path: &str) -> Result<Signer> {
        self.unlock().await?;

        let secret = self.secret.read().await;
        let secret = secret.as_ref().unwrap().lock().await;

        let signer = signer_from_secret(&secret);
        Ok(Signer::SigningKey(signer.with_chain_id(chain_id)))
    }
}

impl PrivateKeyWallet {
    pub async fn from_params(params: PrivateKeyWalletParams) -> Result<Self> {
        let wallet: signers::Wallet<SigningKey> = params.private_key.clone().try_into().unwrap();

        let ciphertext = iron_crypto::encrypt(&params.private_key, &params.password).unwrap();

        Ok(Self {
            name: params.name,
            address: wallet.address().to_alloy(),
            ciphertext,
            secret: Default::default(),
            expirer: Default::default(),
        })
    }

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
            let password = if let Some(DialogMsg::Data(payload)) = dialog.recv().await {
                let password = payload["password"].clone();
                password
                    .as_str()
                    .ok_or(Error::UnlockDialogRejected)?
                    .to_string()
            } else {
                return Err(Error::UnlockDialogRejected);
            };

            // if password was given, and correctly decrypts the keystore
            if let Ok(mnemonic) = iron_crypto::decrypt(&self.ciphertext, &password) {
                self.store_secret(mnemonic).await;
                return Ok(());
            }

            dialog.send("failed", None).await?;
        }

        Err(Error::UnlockDialogFailed)
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
pub struct PrivateKeyWalletParams {
    private_key: String,
    password: String,
    name: String,
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
fn signer_from_secret(secret: &SecretVec<u8>) -> signers::Wallet<SigningKey> {
    let signer_bytes = secret.borrow();
    signers::Wallet::from_bytes(&signer_bytes).unwrap()
}
