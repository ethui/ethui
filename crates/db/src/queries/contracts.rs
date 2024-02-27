use sqlx::Row;
use std::str::FromStr;
use tracing::instrument;

use iron_types::{Abi, Address};

use crate::{Result, DB};
impl DB {
    pub async fn get_contracts(&self, chain_id: u32) -> Result<Vec<Address>> {
        let res: Vec<_> = sqlx::query(
            r#" SELECT address
            FROM contracts
            WHERE chain_id = ? "#,
        )
        .bind(chain_id)
        .map(|row| Address::from_str(row.get::<&str, _>("address")).unwrap())
        .fetch_all(self.pool())
        .await?;

        Ok(res)
    }

    pub async fn get_contract_name(&self, chain_id: u32, address: Address) -> Result<String> {
        let res = sqlx::query(
            r#" SELECT name
            FROM contracts
            WHERE chain_id = ? AND address = ? "#,
        )
        .bind(chain_id)
        .bind(format!("0x{:x}", address))
        .map(|row| row.get("name"))
        .fetch_one(self.pool())
        .await?;

        Ok(res)
    }

    pub async fn get_contract_abi(&self, chain_id: u32, address: Address) -> Result<Abi> {
        let res = sqlx::query(
            r#" SELECT abi
            FROM contracts
            WHERE chain_id = ? AND address = ? "#,
        )
        .bind(chain_id)
        .bind(format!("0x{:x}", address))
        .map(|row| serde_json::from_str(row.get::<&str, _>("abi")).unwrap_or_default())
        .fetch_one(self.pool())
        .await?;

        Ok(res)
    }

    #[instrument(level = "trace", skip(self, abi))]
    pub async fn insert_contract_with_abi(
        &self,
        chain_id: u32,
        address: Address,
        abi: Option<String>,
        name: Option<String>,
    ) -> Result<()> {
        sqlx::query(
            r#" INSERT INTO contracts (address, chain_id, abi, name)
                VALUES (?,?,?,?)
                ON CONFLICT(address, chain_id) DO NOTHING "#,
        )
        .bind(format!("0x{:x}", address))
        .bind(chain_id)
        .bind(abi)
        .bind(name)
        .execute(self.pool())
        .await?;

        Ok(())
    }
}
