use sqlx::{Row, sqlite::SqliteRow};

use crate::prelude::*;

#[derive(Debug)]
pub enum Event {
    Tx(Box<Tx>),
    ContractDeployed(ContractDeployed),
    ERC20Transfer(ERC20Transfer),
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Tx {
    pub hash: B256,
    pub trace_address: Option<Vec<usize>>,

    pub from: Address,
    /// Optional because it could be a contract creation
    pub to: Option<Address>,

    // Other optional fields indicate we don't yet have this data
    pub block_number: Option<u64>,
    pub value: Option<U256>,
    pub data: Option<Bytes>,
    pub position: Option<usize>,
    pub status: u64,
    pub deployed_contract: Option<Address>,
    pub gas_limit: Option<u64>,
    pub gas_used: Option<u64>,
    pub max_fee_per_gas: Option<u128>,
    pub max_priority_fee_per_gas: Option<u128>,
    pub nonce: Option<u64>,
    pub r#type: Option<u64>,
    pub incomplete: bool,
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
    pub block_number: Option<u64>,
    pub proxy_for: Option<Address>,
}

impl From<ContractDeployed> for Event {
    fn from(value: ContractDeployed) -> Self {
        Self::ContractDeployed(value)
    }
}

impl From<Tx> for Event {
    fn from(value: Tx) -> Self {
        Self::Tx(Box::new(value))
    }
}

impl From<ERC20Transfer> for Event {
    fn from(value: ERC20Transfer) -> Self {
        Self::ERC20Transfer(value)
    }
}

impl TryFrom<&SqliteRow> for Tx {
    type Error = ();

    fn try_from(row: &SqliteRow) -> Result<Self, Self::Error> {
        Ok(Self {
            hash: B256::from_str(row.get("hash")).unwrap(),
            trace_address: row
                .get::<Option<String>, _>("trace_address")
                .map(|t| t.split('/').map(|v| v.parse().unwrap()).collect()),
            from: Address::from_str(row.get("from_address")).unwrap(),
            to: Address::from_str(row.get("to_address")).ok(),
            value: row
                .get::<Option<String>, _>("value")
                .map(|v| U256::from_str_radix(&v, 10).unwrap()),
            data: row
                .get::<Option<String>, _>("data")
                .map(|b| Bytes::from_str(&b).unwrap()),
            gas_limit: row.get::<Option<u64>, _>("gas_limit"),
            gas_used: row.get::<Option<u64>, _>("gas_used"),
            max_fee_per_gas: row
                .get::<Option<&str>, _>("max_fee_per_gas")
                .map(|v| v.parse::<u128>().unwrap()),
            max_priority_fee_per_gas: row
                .get::<Option<&str>, _>("max_priority_fee_per_gas")
                .map(|v| v.parse::<u128>().unwrap()),
            r#type: row.get::<Option<i32>, _>("type").map(|b| b as u64),

            block_number: row.get::<Option<i64>, _>("block_number").map(|b| b as u64),
            nonce: row.get::<Option<i64>, _>("nonce").map(|b| b as u64),
            position: Some(row.get::<i32, _>("position") as usize),
            status: row.get::<i32, _>("status") as u64,
            incomplete: row.get::<bool, _>("incomplete"),
            deployed_contract: None,
        })
    }
}
