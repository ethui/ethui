use alloy::json_abi::JsonAbi;

use crate::prelude::*;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Contract {
    pub chain_id: u64,
    pub dedup_id: i32,
    pub name: Option<String>,
    pub address: Address,
    pub proxy_for: Option<Address>,
    pub proxied_by: Option<Address>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ContractWithAbi {
    pub chain_id: u64,
    pub dedup_id: i32,
    pub name: Option<String>,
    pub address: Address,
    pub abi: Option<JsonAbi>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub name: String,
    pub path: String,
    pub git_root: Option<String>,
    pub addresses: Vec<Address>,
}
