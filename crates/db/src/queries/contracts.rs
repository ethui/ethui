use std::str::FromStr;
use tracing::instrument;

use iron_types::{Abi, Address};

use crate::{Db, Error, Result};

impl Db {
    pub async fn get_contract_addresses(&self, chain_id: u32) -> Result<Vec<Address>> {
        let rows = sqlx::query!(
            r#"SELECT address FROM contracts WHERE chain_id = ?"#,
            chain_id
        )
        .fetch_all(self.pool())
        .await?;

        Ok(rows
            .into_iter()
            .filter_map(|r| Address::from_str(&r.address).ok())
            .collect())
    }

    pub async fn get_contract_name(&self, chain_id: u32, address: Address) -> Result<String> {
        let address = format!("0x{:x}", address);

        let res = sqlx::query!(
            r#" SELECT name
                FROM contracts
                WHERE chain_id = ? AND address = ? "#,
            chain_id,
            address
        )
        .fetch_one(self.pool())
        .await?;

        res.name.ok_or(Error::NotFound)
    }

    pub async fn get_contract_abi(&self, chain_id: u32, address: Address) -> Result<Abi> {
        let address = format!("0x{:x}", address);

        let res = sqlx::query!(
            r#" SELECT abi
                FROM contracts
                WHERE chain_id = ? AND address = ? "#,
            chain_id,
            address
        )
        .fetch_one(self.pool())
        .await?;

        match res.abi {
            None => Err(Error::NotFound),
            Some(abi) => Ok(serde_json::from_str(&abi).unwrap_or_default()),
        }
    }

    #[instrument(level = "trace", skip(self, abi))]
    pub async fn insert_contract_with_abi(
        &self,
        chain_id: u32,
        address: Address,
        abi: Option<String>,
        name: Option<String>,
    ) -> Result<()> {
        let address = format!("0x{:x}", address);

        sqlx::query!(
            r#" INSERT INTO contracts (address, chain_id, abi, name)
                VALUES (?,?,?,?)
                ON CONFLICT(address, chain_id) DO NOTHING "#,
            address,
            chain_id,
            abi,
            name
        )
        .execute(self.pool())
        .await?;

        Ok(())
    }
}
