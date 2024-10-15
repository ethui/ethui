use serde::Serialize;

use alloy::{json_abi::JsonAbi, primitives::Address};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Contract {
    pub chain_id: u32,
    pub name: Option<String>,
    pub address: Address,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ContractWithAbi {
    pub chain_id: u32,
    pub name: Option<String>,
    pub address: Address,
    pub abi: Option<JsonAbi>,
}
