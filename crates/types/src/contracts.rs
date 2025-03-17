use alloy::{json_abi::JsonAbi, primitives::Address};
use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Contract {
    pub chain_id: u32,
    pub dedup_id: i32,
    pub name: Option<String>,
    pub address: Address,
    pub proxy_for: Option<Address>,
    pub proxied_by: Option<Address>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ContractWithAbi {
    pub chain_id: u32,
    pub dedup_id: i32,
    pub name: Option<String>,
    pub address: Address,
    pub abi: Option<JsonAbi>,
}
