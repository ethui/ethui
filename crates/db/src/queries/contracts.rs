use std::str::FromStr;

use alloy::{json_abi::JsonAbi, primitives::Bytes};
use ethui_types::{Contract, ContractWithAbi, prelude::*};
use tracing::instrument;

use crate::DbInner;

impl DbInner {
    pub async fn get_contracts(&self, chain_id: u64, dedup_id: i32) -> Result<Vec<Contract>> {
        let chain_id_u32 = chain_id as u32;
        let rows = sqlx::query!(
            r#"SELECT address, name, proxy_for, proxied_by FROM contracts WHERE chain_id = ? AND dedup_id = ?"#,
            chain_id_u32, dedup_id
        ).fetch_all(self.pool())
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| Contract {
                address: Address::from_str(&r.address).unwrap(),
                chain_id,
                dedup_id,
                name: r.name,
                proxy_for: r.proxy_for.map(|p| Address::from_str(&p).unwrap()),
                proxied_by: r.proxied_by.map(|p| Address::from_str(&p).unwrap()),
            })
            .collect())
    }

    pub async fn get_contract(
        &self,
        chain_id: u64,
        dedup_id: i32,
        address: Address,
    ) -> Result<Option<ContractWithAbi>> {
        let chain_id_u32 = chain_id as u32;
        let address = format!("0x{address:x}");
        let res = sqlx::query!(
            r#" SELECT abi, name, address
                FROM contracts
                WHERE chain_id = ? AND dedup_id = ? AND address = ? "#,
            chain_id_u32,
            dedup_id,
            address
        )
        .fetch_one(self.pool())
        .await?;

        match res.abi {
            None => Ok(None),
            Some(abi) => Ok(Some(ContractWithAbi {
                abi: serde_json::from_str(&abi).unwrap_or_default(),
                chain_id,
                dedup_id,
                name: res.name,
                address: Address::from_str(&res.address).unwrap(),
            })),
        }
    }

    pub async fn get_contract_abi(&self, chain_id: u64, address: Address) -> Result<JsonAbi> {
        let address = format!("0x{address:x}");
        let chain_id = chain_id as u32;

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
            None => Err(eyre!("not found")),
            Some(abi) => Ok(serde_json::from_str(&abi).unwrap_or_default()),
        }
    }

    pub async fn get_contract_impl_abi(&self, chain_id: u64, address: Address) -> Result<JsonAbi> {
        let address = format!("0x{address:x}");

        let res = sqlx::query!(
            r#" SELECT proxy_for,abi
                FROM contracts
                WHERE address = ? "#,
            address
        )
        .fetch_one(self.pool())
        .await?;

        match (res.proxy_for, res.abi) {
            (None, Some(abi)) => Ok(serde_json::from_str(&abi).unwrap_or_default()),
            (Some(proxy_for), _) => {
                Box::pin(
                    self.get_contract_impl_abi(chain_id, Address::from_str(&proxy_for).unwrap()),
                )
                .await
            }
            _ => Err(eyre!("not found")),
        }
    }

    #[instrument(level = "trace", skip(self, abi))]
    pub async fn insert_contract_with_abi(
        &self,
        id: NetworkId,
        address: Address,
        code: Option<&Bytes>,
        abi: Option<String>,
        name: Option<String>,
        proxy_for: Option<Address>,
    ) -> Result<()> {
        let address = format!("0x{address:x}");
        let proxy_for = proxy_for.map(|p| format!("0x{p:x}"));
        let code = code.map(|c| format!("0x{c:x}"));
        let chain_id = id.chain_id() as u32;
        let dedup_id = id.dedup_id() as u32;

        sqlx::query!(
            r#" INSERT INTO contracts (address, chain_id, dedup_id, code, abi, name, proxy_for)
                VALUES (?,?,?,?,?,?,?)
                ON CONFLICT(address, chain_id, dedup_id) DO UPDATE SET name=?, abi=?, code=?"#,
            address,
            chain_id,
            dedup_id,
            code,
            abi,
            name,
            proxy_for,
            name,
            abi,
            code
        )
        .execute(self.pool())
        .await?;

        if let Some(proxy_for) = proxy_for {
            sqlx::query!(
                r#" INSERT INTO contracts (address, chain_id, dedup_id, proxied_by)
                VALUES (?,?,?,?)
                ON CONFLICT(address, chain_id, dedup_id) DO UPDATE SET proxied_by=?"#,
                proxy_for,
                chain_id,
                dedup_id,
                address,
                address
            )
            .execute(self.pool())
            .await?;
        }

        Ok(())
    }

    pub async fn get_incomplete_contracts(
        &self,
    ) -> Result<Vec<((u64, u64), Address, Option<Bytes>)>> {
        let rows = sqlx::query!(
            r#"SELECT address, chain_id, dedup_id, code FROM contracts WHERE name IS NULL or ABI IS NULL"#,
        )
        .fetch_all(self.pool())
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| {
                (
                    (r.chain_id as u64, r.dedup_id.unwrap() as u64),
                    Address::from_str(&r.address).unwrap(),
                    r.code
                        .map(|c| Bytes::from_str(c.trim_start_matches("0x")).unwrap()),
                )
            })
            .collect())
    }

    pub async fn remove_contracts(&self, chain_id: u64, dedup_id: u64) -> Result<()> {
        let chain_id = chain_id as u32;
        let dedup_id = dedup_id as u32;
        sqlx::query!(
            r#"DELETE FROM contracts where chain_id = ? AND dedup_id = ?"#,
            chain_id,
            dedup_id
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn remove_contract(
        &self,
        chain_id: u64,
        dedup_id: i32,
        address: Address,
    ) -> Result<()> {
        let address = format!("0x{address:x}");
        let chain_id = chain_id as u32;

        sqlx::query!(
            r#"DELETE FROM contracts WHERE chain_id = ? AND dedup_id = ? AND address = ?"#,
            chain_id,
            dedup_id,
            address
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn get_proxy(
        &self,
        chain_id: u64,
        dedup_id: i32,
        address: Address,
    ) -> Option<Address> {
        let address = format!("0x{address:x}");
        let chain_id = chain_id as u32;

        let result = sqlx::query_scalar!(
            r#"SELECT proxy_for FROM contracts WHERE chain_id = ? AND dedup_id = ? AND address = ?"#,
            chain_id,
            dedup_id,
            address
        )
        .fetch_one(&self.pool)
        .await
        .ok()?;

        result.map(|value| Address::from_str(value.as_str()).unwrap())
    }

    pub async fn get_contract_addresses(
        &self,
        chain_id: u64,
        dedup_id: u32,
    ) -> Result<Vec<Address>> {
        let chain_id = chain_id as u32;
        let addresses = sqlx::query_scalar!(
            r#"SELECT DISTINCT address FROM contracts WHERE chain_id = ? AND dedup_id = ?"#,
            chain_id,
            dedup_id
        )
        .fetch_all(self.pool())
        .await?;

        Ok(addresses
            .into_iter()
            .filter_map(|addr| Address::from_str(&addr).ok())
            .collect())
    }
}
