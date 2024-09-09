use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Erc20Metadata {
    pub decimals: Option<u8>,
    pub logo: Option<String>,
    pub name: Option<String>,
    pub symbol: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct OwnerSafeAccounts {
    pub safes: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SafeData {
    pub address: String,
    pub nonce: u64,
    pub threshold: String,
    pub owners: Vec<String>,
    pub master_copy: String,
    pub modules: Vec<String>,
    pub fallback_handler: String,
    pub guard: String,
    pub version: Option<String>,
}
