use crate::Address;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SafeContractData {
    pub address: Address,
    pub owners: Vec<Address>,
    pub threshold: u32,
    pub nonce: u32,
    pub modules: Vec<Address>,
    pub master_copy: Address,
    pub fallback_handler: Address,
    pub guard: Address,
    pub version: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SafeMultisigTxsData {
    pub to: Address,
    pub data: String,
    pub nonce: u32,
    pub safe_tx_hash: String,
    pub proposer: Address,
    pub is_executed: bool,
    pub is_sucessfull: bool,
    pub confirmations_required: u32,
    pub confirmations: Vec<Address>,
}
