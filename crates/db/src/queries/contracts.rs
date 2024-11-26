use std::str::FromStr;

use alloy::json_abi::JsonAbi;
use ethui_types::{Address, Contract, ContractWithAbi};
use tracing::instrument;

use crate::{DbInner, Error, Result};

impl DbInner {
    pub async fn get_contracts(&self, chain_id: u32) -> Result<Vec<Contract>> {
        let rows = sqlx::query!(
            r#"SELECT address, name FROM contracts WHERE chain_id = ?"#,
            chain_id
        )
        .fetch_all(self.pool())
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| Contract {
                address: Address::from_str(&r.address).unwrap(),
                chain_id,
                name: r.name,
            })
            .collect())
    }

    pub async fn get_contract(
        &self,
        chain_id: u32,
        address: Address,
    ) -> Result<Option<ContractWithAbi>> {
        let address = format!("0x{:x}", address);

        let res = sqlx::query!(
            r#" SELECT abi, name, address
                FROM contracts
                WHERE chain_id = ? AND address = ? "#,
            chain_id,
            address
        )
        .fetch_one(self.pool())
        .await?;

        match res.abi {
            None => Ok(None),
            Some(abi) => Ok(Some(ContractWithAbi {
                abi: serde_json::from_str(&abi).unwrap_or_default(),
                chain_id,
                name: res.name,
                address: Address::from_str(&res.address).unwrap(),
            })),
        }
    }

    pub async fn get_contract_abi(&self, chain_id: u32, address: Address) -> Result<JsonAbi> {
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
                ON CONFLICT(address, chain_id) DO UPDATE SET name=?, abi=?"#,
            address,
            chain_id,
            abi,
            name,
            name,
            abi
        )
        .execute(self.pool())
        .await?;

        Ok(())
    }

    pub async fn get_incomplete_contracts(&self) -> Result<Vec<(u32, Address)>> {
        let rows = sqlx::query!(
            r#"SELECT address, chain_id FROM contracts WHERE name IS NULL or ABI IS NULL"#,
        )
        .fetch_all(self.pool())
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| (r.chain_id as u32, Address::from_str(&r.address).unwrap()))
            .collect())
    }
}
