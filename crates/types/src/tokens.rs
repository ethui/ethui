use std::str::FromStr;

use serde::Serialize;
use sqlx::{sqlite::SqliteRow, Row};

use crate::{Address, U256};

#[derive(Debug, Serialize)]
pub struct TokenBalance {
    pub contract: Address,
    pub balance: U256,
    pub metadata: TokenMetadata,
}

#[derive(Debug, Serialize)]
pub struct TokenMetadata {
    pub name: String,
    pub symbol: String,
    pub decimals: u8,
}

#[derive(Debug, Serialize)]
pub struct Erc721TokenDetails {
    pub uri: String,
    pub metadata: String,
}

#[derive(Debug, Serialize)]
pub struct Erc721TokenData {
    pub contract: Address,
    pub token_id: U256,
    pub owner: Address,
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub metadata: String,
}

impl TryFrom<SqliteRow> for Erc721TokenData {
    type Error = ();

    fn try_from(row: SqliteRow) -> Result<Self, Self::Error> {
        Ok(Self {
            contract: Address::from_str(row.get("contract")).unwrap(),
            owner: Address::from_str(row.get("owner")).unwrap(),
            token_id: U256::from_str(row.get("token_id")).unwrap(),
            uri: row.get("uri"),
            metadata: row.get("metadata"),
            name: row.get("name"),
            symbol: row.get("symbol"),
        })
    }
}

#[derive(Debug, Serialize)]
pub struct Erc721Collection {
    pub contract: Address,
    pub name: String,
    pub symbol: String,
}

#[derive(Debug, Serialize)]
pub struct Erc721Token {
    pub contract: Address,
    pub token_id: U256,
    pub owner: Address,
    pub uri: String,
    pub metadata: String,
}

impl TryFrom<SqliteRow> for Erc721Token {
    type Error = ();

    fn try_from(row: SqliteRow) -> Result<Self, Self::Error> {
        Ok(Self {
            contract: Address::from_str(row.get("contract")).unwrap(),
            owner: Address::from_str(row.get("owner")).unwrap(),
            token_id: U256::from_str(row.get("token_id")).unwrap(),
            uri: row.get("uri"),
            metadata: row.get("metadata"),
        })
    }
}
