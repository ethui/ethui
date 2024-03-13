use std::str::FromStr;

use iron_types::{Abi, Address, Contract, ContractWithAbi};
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
