use crate::Address;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SafeContractData {
    pub address: Address,
    pub owners: Vec<Address>,
    pub threshold: u32,
    pub nonce: u32,
    pub modules: Vec<Option<Address>>,
    pub master_copy: Address,
    pub fallback_handler: Address,
    pub guard: Address,
    pub version: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SafeMultisigTxData {
    pub safe: Address,
    pub to: Address,
    pub data: Option<String>,
    pub nonce: u32,
    pub safe_tx_hash: String,
    pub proposer: Option<Address>,
    pub is_executed: bool,
    pub is_successful: Option<bool>,
    pub confirmations_required: u32,
    pub confirmations: Vec<SafeConfirmations>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SafeConfirmations {
    pub owner: Address,
}
