#![allow(dead_code)]

use std::path::PathBuf;

use ethers_core::k256::ecdsa::SigningKey;

use super::{Result, WalletControl};
use crate::types::ChecksummedAddress;

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
pub struct JsonKeystoreWallet {
    pub path: PathBuf,
    derivation_path: String,
    count: u32,
    current_path: String,
}

impl JsonKeystoreWallet {
    pub fn new() -> Self {
        Self {
            path: PathBuf::new(),
            derivation_path: String::new(),
            count: 0,
            current_path: String::new(),
        }
    }
}

#[async_trait::async_trait]
impl WalletControl for JsonKeystoreWallet {
    fn name(&self) -> String {
        todo!()
    }

    async fn get_current_address(&self) -> ChecksummedAddress {
        todo!()
    }

    async fn set_current_path(&mut self, path: &str) -> Result<()> {
        todo!()
    }

    async fn build_signer(&self, chain_id: u32) -> Result<ethers::signers::Wallet<SigningKey>> {
        todo!()
    }

    async fn derive_all_addresses(&self) -> Result<Vec<(String, ChecksummedAddress)>> {
        todo!()
    }
}
