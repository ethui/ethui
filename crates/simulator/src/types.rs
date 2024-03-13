use alloy_primitives::{Bytes, U256};
use ethers::types::Log;
use foundry_evm::traces::CallTraceNode;
use iron_types::Address;
use serde::{Deserialize, Serialize};

/// Simulation request
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Request {
    pub from: Address,
    pub to: Address,
    pub data: Option<Bytes>,
    pub gas_limit: u64,
    pub value: Option<U256>,
}

/// Simulation result
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Result {
    pub gas_used: u64,
    pub block_number: u64,
    pub success: bool,
    pub traces: Vec<CallTraceNode>,
    pub logs: Vec<Log>,
    pub return_data: Bytes,
}
