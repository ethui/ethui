use std::str::FromStr;

use super::U64;
use serde::Serialize;
use sqlx::{sqlite::SqliteRow, Row};

use crate::{Address, Bytes, B256, U256};

#[derive(Debug)]
pub enum Event {
    Tx(Tx),
    ContractDeployed(ContractDeployed),
    ERC20Transfer(ERC20Transfer),
    ERC721Transfer(ERC721Transfer),
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Tx {
    pub hash: B256,
    pub from: Address,
    pub to: Option<Address>,
    pub value: U256,
    pub data: Bytes,
    pub block_number: u64,
    pub position: Option<usize>,
    pub status: u64,
    pub deployed_contract: Option<Address>,
}

#[derive(Debug)]
pub struct ERC20Transfer {
    pub from: Address,
    pub to: Address,
    pub value: U256,
    pub contract: Address,
    pub block_number: u64,
}

#[derive(Debug)]
pub struct ERC721Transfer {
    pub from: Address,
    pub to: Address,
    pub token_id: U256,
    pub contract: Address,
    pub block_number: u64,
}

#[derive(Debug)]
pub struct ContractDeployed {
    pub address: Address,
    pub code: Option<Bytes>,
    pub block_number: u64,
}

impl From<ContractDeployed> for Event {
    fn from(value: ContractDeployed) -> Self {
        Self::ContractDeployed(value)
    }
}

impl From<Tx> for Event {
    fn from(value: Tx) -> Self {
        Self::Tx(value)
    }
}

impl From<ERC20Transfer> for Event {
    fn from(value: ERC20Transfer) -> Self {
        Self::ERC20Transfer(value)
    }
}

impl From<ERC721Transfer> for Event {
    fn from(value: ERC721Transfer) -> Self {
        Self::ERC721Transfer(value)
    }
}

impl TryFrom<&SqliteRow> for Tx {
    type Error = ();

    fn try_from(row: &SqliteRow) -> Result<Self, Self::Error> {
        Ok(Self {
            hash: B256::from_str(row.get("hash")).unwrap(),
            from: Address::from_str(row.get("from_address")).unwrap(),
            to: Address::from_str(row.get("to_address")).ok(),
            value: U256::from_str_radix(row.get("value"), 10).unwrap(),
            data: Bytes::from_str(row.get("data")).unwrap(),
            block_number: row.get::<i64, _>("block_number") as u64,
            position: Some(row.get::<i32, _>("position") as usize),
            status: row.get::<i32, _>("status") as u64,
            deployed_contract: None,
        })
    }
}
