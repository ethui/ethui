use std::{sync::Arc, time::Duration};

use async_trait::async_trait;
use ethers::{
    core::k256::ecdsa::SigningKey,
    signers::{self, coins_bip39::English, MnemonicBuilder, Signer},
};
use iron_crypto::{self, EncryptedData};
use iron_dialogs::{Dialog, DialogMsg};
use iron_types::Address;
use secrets::SecretVec;
use tokio::{
    sync::{Mutex, RwLock},
    task::JoinHandle,
};

use super::{utils, wallet::WalletCreate, Error, Result, Wallet, WalletControl};

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct HDWallet {
    name: String,
    derivation_path: String,
    count: u32,
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
    async fn create(params: serde_json::Value) -> Result<Wallet> {
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

    async fn update(mut self, params: serde_json::Value) -> Result<Wallet> {
        if let Some(name) = params["name"].as_str() {
            self.name = name.into();
        }
        if let Some(path) = params["derivationPath"].as_str() {
            self.update_derivation_path(path.into()).await?;
        }
        if let Some(count) = params["count"].as_u64() {
            self.update_count(count as u32).await?;
        }

        Ok(Wallet::HDWallet(self))
    }

    async fn get_current_address(&self) -> Address {
        self.current.1
    }

    fn get_current_path(&self) -> String {
        self.current.0.clone()
    }

    async fn set_current_path(&mut self, path: String) -> Result<()> {
        self.current = self
            .addresses
            .iter()
            .find(|(p, _)| p == &path)
            .cloned()
            .ok_or(Error::InvalidKey(path))?;

        Ok(())
    }

    async fn get_address(&self, path: &str) -> Result<Address> {
        self.addresses
            .iter()
            .find(|(p, _)| p == path)
            .map(|(_, a)| *a)
            .ok_or(Error::InvalidKey(path.into()))
    }

    async fn build_signer(&self, chain_id: u32, path: &str) -> Result<signers::Wallet<SigningKey>> {
        if !self.addresses.iter().any(|(p, _)| p == path) {
            return Err(Error::InvalidKey(path.to_string()));
        }

        self.unlock().await?;

        let secret = self.secret.read().await;
        let secret = secret.as_ref().unwrap().lock().await;

        let mnemonic = mnemonic_from_secret(&secret);
        let signer = MnemonicBuilder::<English>::default()
            .phrase(mnemonic.as_str())
            .derivation_path(path)?
            .build()?;

        Ok(signer.with_chain_id(chain_id))
    }

    async fn get_all_addresses(&self) -> Vec<(String, Address)> {
        self.addresses.clone()
    }
}

impl HDWallet {
    pub async fn from_params(params: HDWalletParams) -> Result<Self> {
        let addresses =
            utils::derive_addresses(&params.mnemonic, &params.derivation_path, params.count);

        // use given `current`, but only after ensuring it is part of the derived list of addresses
        let current = if let Some(current) = addresses.iter().find(|(p, _)| p == &params.current) {
            current.clone()
        } else {
            return Err(Error::InvalidKey(params.current));
        };

        let ciphertext = iron_crypto::encrypt(&params.mnemonic, &params.password).unwrap();

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

    async fn update_derivation_path(&mut self, derivation_path: String) -> Result<()> {
        self.derivation_path = derivation_path;

        self.update_derived_addresses().await?;

        Ok(())
    }

    async fn update_count(&mut self, count: u32) -> Result<()> {
        self.count = count;

        self.update_derived_addresses().await?;

        Ok(())
    }

    async fn update_derived_addresses(&mut self) -> Result<()> {
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
            if let Ok(mnemonic) = iron_crypto::decrypt(&self.ciphertext, &password) {
                self.store_secret(mnemonic).await;
                dialog.close().await?;
                return Ok(());
            }

            dialog.send("failed", None).await?;
        }

        dialog.close().await?;
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
pub struct HDWalletParams {
    mnemonic: String,
    derivation_path: String,
    current: String,
    password: String,
    name: String,
    count: u32,
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
