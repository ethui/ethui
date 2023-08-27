use std::str::FromStr;

use ethers::{abi::Abi, types::Address};
use sqlx::{sqlite::SqliteRow, Row};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StoredContract {
    address: Address,
    abi: Abi,
    name: String,
}

impl TryFrom<SqliteRow> for StoredContract {
    type Error = ();

    fn try_from(row: SqliteRow) -> std::result::Result<Self, Self::Error> {
        Ok(Self {
            address: Address::from_str(row.get::<&str, _>("address")).unwrap(),
            abi: serde_json::from_str(row.get::<&str, _>("abi")).unwrap_or_default(),
            name: row.get::<&str, _>("name").to_owned(),
        })
    }
}
