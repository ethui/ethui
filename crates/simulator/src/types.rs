use alloy::primitives::Log;
use common::prelude::*;

/// Simulation request
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Request {
    pub from: Address,
    pub to: Option<Address>,
    pub data: Option<Bytes>,
    pub gas_limit: u64,
    pub value: Option<U256>,
}

/// Simulation result
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SimResult {
    pub gas_used: u64,
    pub success: bool,
    pub logs: Vec<Log>,
    pub return_data: Option<Bytes>,
}
