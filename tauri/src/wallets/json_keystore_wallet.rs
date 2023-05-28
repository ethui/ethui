#![allow(dead_code)]

use std::time::Duration;
use std::{fs::File, io::BufReader, path::PathBuf, str::FromStr, sync::Arc};

use ethers::signers::Signer;
use ethers_core::{k256::ecdsa::SigningKey, types::Address};
use tokio::sync::RwLock;
use tokio::task::JoinHandle;

use super::{Error, Result, WalletControl};
use crate::dialogs::DialogMsg;
use crate::{dialogs::Dialog, types::ChecksummedAddress};

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
pub struct JsonKeystoreWallet {
    name: String,
    pub file: PathBuf,

    /// The signer is cached inside a `RwLock` so we can have interior mutability
    /// Since JSON keystore signers are time-consuming to decrypt, we can't do it on-the-fly for
    /// every incoming signing request
    #[serde(skip)]
    signer: Arc<RwLock<Option<ethers::signers::Wallet<SigningKey>>>>,

    /// A join handle that will expire the signer after some time
    #[serde(skip)]
    expirer: Arc<RwLock<Option<JoinHandle<()>>>>,
}

impl JsonKeystoreWallet {
    pub fn new() -> Self {
        Self {
            name: "".into(),
            file: PathBuf::new(),
            signer: Default::default(),
            expirer: Default::default(),
        }
    }
}

#[async_trait::async_trait]
impl WalletControl for JsonKeystoreWallet {
    fn name(&self) -> String {
        self.name.clone()
    }

    async fn get_current_address(&self) -> ChecksummedAddress {
        let file = File::open(self.file.clone()).unwrap();
        let reader = BufReader::new(file);
        let mut res: serde_json::Value = serde_json::from_reader(reader).unwrap();

        // TODO: this should be fail correctly
        let address: Address = Address::from_str(res["address"].take().as_str().unwrap()).unwrap();

        address.into()
    }

    async fn set_current_path(&mut self, _path: &str) -> Result<()> {
        Ok(())
    }

    async fn build_signer(&self, chain_id: u32) -> Result<ethers::signers::Wallet<SigningKey>> {
        self.unlock().await?;

        let signer = self.signer.read().await;
        Ok(signer.clone().unwrap().with_chain_id(chain_id))
    }

    async fn derive_all_addresses(&self) -> Result<Vec<(String, ChecksummedAddress)>> {
        Ok(vec![("default".into(), self.get_current_address().await)])
    }
    fn is_dev(&self) -> bool {
        false
    }
}

impl JsonKeystoreWallet {
    async fn unlock(&self) -> Result<()> {
        // if we already have a signer, then we're good
        {
            let signer = self.signer.read().await;
            if signer.is_some() {
                return Ok(());
            }
        }

        // open the dialog
        let dialog = Dialog::new("jsonkeystore-unlock", serde_json::to_value(self).unwrap());
        dialog.open().await?;

        // attempt to receive a password at most 3 times
        for _ in 0..3 {
            let password = match dialog.recv().await {
                Some(DialogMsg::Data(payload)) | Some(DialogMsg::Accept(payload)) => {
                    let password = payload["password"].clone();
                    Ok(password
                        .as_str()
                        .ok_or(Error::UnlockDialogRejected)?
                        .to_string())
                }
                _ => Err(Error::UnlockDialogRejected),
            };

            // if password was given, and correctly decrypts the keystore
            if let Ok(password) = password {
                if let Ok(keystore) =
                    ethers::signers::Wallet::decrypt_keystore(self.file.clone(), password)
                {
                    let mut expirer = self.expirer.write().await;
                    let mut signer = self.signer.write().await;

                    // set up cache expiration for 1 minute
                    let signer_clone = self.signer.clone();
                    *expirer = Some(tokio::spawn(async move {
                        tokio::time::sleep(Duration::from_secs(60)).await;
                        signer_clone.write().await.take();
                    }));

                    // set cache signer
                    *signer = Some(keystore);

                    dialog.close().await?;
                    return Ok(());
                }
            }

            dialog.send("failed", None).await?;
        }

        dialog.close().await?;
        Err(Error::UnlockDialogFailed)
    }
}
