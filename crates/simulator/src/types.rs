use ethers::{
    abi::{Address, Uint},
    core::types::Log,
    types::{transaction::eip2718::TypedTransaction, Bytes, NameOrAddress, U256},
};
use foundry_evm::CallKind;
use revm::interpreter::InstructionResult;
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
    pub simulation_id: u64,
    pub gas_used: u64,
    pub block_number: u64,
    pub success: bool,
    pub trace: Vec<CallTrace>,
    pub logs: Vec<Log>,
    pub exit_reason: InstructionResult,
    pub return_data: Bytes,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CallTrace {
    pub call_type: CallKind,
    pub from: Address,
    pub to: Address,
    pub value: Uint,
}

impl TryFrom<TypedTransaction> for Request {
    type Error = ();

    fn try_from(value: TypedTransaction) -> std::result::Result<Self, Self::Error> {
        Ok(Self {
            from: *value.from().ok_or(())?,
            to: *value.to().ok_or(()).and_then(|v| match v {
                NameOrAddress::Name(_) => Err(()),
                NameOrAddress::Address(a) => Ok(a),
            })?,
            value: value.value().cloned(),
            data: value.data().cloned(),
            gas_limit: value.gas().map(|v| v.as_u64()).ok_or(())?,
        })
    }
}
