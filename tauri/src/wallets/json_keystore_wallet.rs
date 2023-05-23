#![allow(dead_code)]

use std::{cell::RefCell, fs::File, io::BufReader, path::PathBuf, str::FromStr, sync::Arc};

use ethers::signers::Signer;
use ethers_core::{k256::ecdsa::SigningKey, types::Address};
use tokio::sync::{Mutex, RwLock};

use super::{Result, WalletControl};
use crate::types::ChecksummedAddress;

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
pub struct JsonKeystoreWallet {
    name: String,
    pub file: PathBuf,

    #[serde(skip)]
    signer: Arc<RwLock<Option<ethers::signers::Wallet<SigningKey>>>>,
}

impl JsonKeystoreWallet {
    pub fn new() -> Self {
        Self {
            name: "".into(),
            file: PathBuf::new(),
            signer: Default::default(),
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
        self.unlock("testtest").await.unwrap();

        let signer = self.signer.read().await;
        Ok(signer.clone().unwrap().with_chain_id(chain_id))
    }

    async fn derive_all_addresses(&self) -> Result<Vec<(String, ChecksummedAddress)>> {
        Ok(vec![("default".into(), self.get_current_address().await)])
    }
}

impl JsonKeystoreWallet {
    async fn unlock(&self, password: &str) -> Result<()> {
        {
            let signer = self.signer.read().await;
            if signer.is_some() {
                return Ok(());
            }
        }

        let keystore_signer =
            ethers::signers::Wallet::decrypt_keystore(self.file.clone(), password)?;

        let mut signer = self.signer.write().await;
        *signer = Some(keystore_signer);

        Ok(())
    }
}
