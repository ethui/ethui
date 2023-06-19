use async_trait::async_trait;
use enum_dispatch::enum_dispatch;
use ethers_core::k256::ecdsa::SigningKey;
use serde::{Deserialize, Serialize};

use super::Result;
use crate::types::ChecksummedAddress;

#[async_trait]
#[enum_dispatch(Wallet)]
pub trait WalletControl: Sync + Send + Deserialize<'static> + Serialize + std::fmt::Debug {
    fn name(&self) -> String;
    async fn get_current_address(&self) -> ChecksummedAddress;
    async fn set_current_path(&mut self, path: String) -> Result<()>;
    async fn get_all_addresses(&self) -> Vec<(String, ChecksummedAddress)>;
    async fn build_signer(&self, chain_id: u32) -> Result<ethers::signers::Wallet<SigningKey>>;

    fn is_dev(&self) -> bool {
        false
    }
}

use super::{JsonKeystoreWallet, PlaintextWallet};

#[enum_dispatch]
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum Wallet {
    Plaintext(PlaintextWallet),
    JsonKeystore(JsonKeystoreWallet),
}
