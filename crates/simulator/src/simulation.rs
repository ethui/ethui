use std::collections::HashMap;

use ethers::{
    abi::{Address, Hash, Uint},
    core::types::Log,
    types::{transaction::eip2930::AccessList, Bytes},
};
use foundry_evm::CallKind;
use revm::interpreter::InstructionResult;
use serde::{Deserialize, Serialize};

use super::evm::{CallRawRequest, Evm};
use crate::{errors::SimulationResult, evm::StorageOverride};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Request {
    pub chain_id: u64,
    pub from: Address,
    pub to: Address,
    pub data: Option<Bytes>,
    pub gas_limit: u64,
    pub value: Option<Uint>,
    pub access_list: Option<AccessList>,
    pub block_number: Option<u64>,
    pub state_overrides: Option<HashMap<Address, StateOverride>>,
    pub format_trace: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Result {
    pub simulation_id: u64,
    pub gas_used: u64,
    pub block_number: u64,
    pub success: bool,
    pub trace: Vec<CallTrace>,
    pub formatted_trace: Option<String>,
    pub logs: Vec<Log>,
    pub exit_reason: InstructionResult,
    pub return_data: Bytes,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct StateOverride {
    pub balance: Option<Uint>,
    pub nonce: Option<u64>,
    pub code: Option<Bytes>,
    #[serde(flatten)]
    pub state: Option<State>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(untagged)]
pub enum State {
    Full {
        state: HashMap<Hash, Uint>,
    },
    #[serde(rename_all = "camelCase")]
    Diff {
        state_diff: HashMap<Hash, Uint>,
    },
}

impl From<State> for StorageOverride {
    fn from(value: State) -> Self {
        let (slots, diff) = match value {
            State::Full { state } => (state, false),
            State::Diff { state_diff } => (state_diff, true),
        };

        StorageOverride {
            slots: slots
                .into_iter()
                .map(|(key, value)| (key, value.into()))
                .collect(),
            diff,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CallTrace {
    pub call_type: CallKind,
    pub from: Address,
    pub to: Address,
    pub value: Uint,
}
