use std::{str::FromStr, sync::Arc, time::Duration};

use alloy::signers::{Signer as _, local::PrivateKeySigner};
use async_trait::async_trait;
use ethui_crypto::{self, EncryptedData};
use ethui_dialogs::{Dialog, DialogMsg};
use ethui_types::prelude::*;
use secrets::SecretVec;
use tokio::{
    sync::{Mutex, RwLock},
    task::JoinHandle,
};

use crate::{Signer, Wallet, WalletControl, wallet::WalletCreate};

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

        let mut signer = signer_from_secret(&secret);
        // TODO: use u64 for chain id
        signer.set_chain_id(Some(chain_id.into()));
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
        let dialog = Dialog::new(
            "wallet-unlock",
            serde_json::to_value(self)
                .map_err(|e| eyre!("Failed to serialize wallet data: {e}"))?,
        );
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
            if let Ok(private_key) = ethui_crypto::decrypt(&self.ciphertext, &password) {
                self.store_secret(private_key).await;
                return Ok(());
            }

            dialog.send("failed", None).await?;
        }

        Err(eyre!("user failed to unlock the wallet"))
    }

    async fn store_secret(&self, private_key: String) {
        // acquire both write locks
        let mut expirer_handle = self.expirer.write().await;
        let mut secret_handle = self.secret.write().await;

        let secret = private_key_into_secret(private_key);

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
pub fn private_key_into_secret(private_key: String) -> SecretVec<u8> {
    let signer_bytes = private_key.into_bytes();
    let bytes = signer_bytes.as_slice();

    SecretVec::new(bytes.len(), |s| {
        (0..bytes.len()).for_each(|i| {
            s[i] = bytes[i];
        });
    })
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
