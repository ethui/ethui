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

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectMetadata {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub project_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub project_path: Option<String>,
}

impl Default for ProjectMetadata {
    fn default() -> Self {
        Self {
            project_name: None,
            project_path: None,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ContractWithProject {
    #[serde(flatten)]
    pub contract: Contract,
    #[serde(flatten)]
    pub project: ProjectMetadata,
}
