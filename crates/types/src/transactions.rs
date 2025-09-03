use alloy::primitives::Bytes;
use serde::Serialize;

use crate::{Address, B256};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Transaction {
    pub hash: B256,
    pub from: Address,
    pub to: Option<Address>,
    pub block_number: Option<u64>,
    pub position: Option<u64>,
    pub data: Option<Bytes>,
    pub status: u64,
    pub incomplete: bool,
}
