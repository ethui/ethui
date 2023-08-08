use std::str::FromStr;

use ethers::types::{Address, U256};
use serde::Serialize;
use sqlx::{sqlite::SqliteRow, Row};

use super::ChecksummedAddress;

#[derive(Debug, Serialize)]
pub struct TokenBalance {
    pub contract: ChecksummedAddress,
    pub balance: U256,
    pub metadata: TokenMetadata,
}

#[derive(Debug, Serialize)]
pub struct TokenMetadata {
    pub name: String,
    pub symbol: String,
    pub decimals: u8,
}

impl TryFrom<SqliteRow> for TokenBalance {
    type Error = ();

    fn try_from(row: SqliteRow) -> Result<Self, Self::Error> {
        Ok(Self {
            contract: Address::from_str(row.get("contract")).unwrap().into(),
            balance: U256::from_str_radix(row.get("balance"), 10).unwrap(),
            metadata: row.try_into().unwrap(),
        })
    }
}

impl TryFrom<SqliteRow> for TokenMetadata {
    type Error = ();

    fn try_from(row: SqliteRow) -> Result<Self, Self::Error> {
        Ok(Self {
            name: row.get("name"),
            decimals: row.get("decimals"),
            symbol: row.get("symbol"),
        })
    }
}

#[derive(Debug, Serialize)]
pub struct Erc721Token {
    pub contract: Address,
    pub owner: Address,
}

impl TryFrom<SqliteRow> for Erc721Token {
    type Error = ();

    fn try_from(row: SqliteRow) -> Result<Self, Self::Error> {
        Ok(Self {
            contract: Address::from_str(row.get("contract")).unwrap(),
            owner: Address::from_str(row.get("owner")).unwrap(),
        })
    }
}
