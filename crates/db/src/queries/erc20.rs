use std::str::FromStr;

use iron_types::{Address, TokenBalance, TokenMetadata, U256};
use sqlx::Row;

use crate::{Result, DB};

impl DB {
    pub async fn get_erc20_metadata(
        &self,
        contract: Address,
        chain_id: u32,
    ) -> Result<TokenMetadata> {
        Ok(super::erc20_read_metadata(contract, chain_id)
            .fetch_one(self.pool())
            .await?)
    }

    pub async fn save_erc20_balances(
        &self,
        chain_id: u32,
        address: Address,
        balances: Vec<(Address, U256)>,
    ) -> Result<()> {
        let mut conn = self.tx().await?;

        for (contract, balance) in balances {
            super::erc20_update_balance(contract, address, chain_id, balance)
                .execute(&mut *conn)
                .await?;
        }

        conn.commit().await?;
        Ok(())
    }

    pub async fn save_erc20_metadata(
        &self,
        address: Address,
        chain_id: u32,
        metadata: TokenMetadata,
    ) -> Result<()> {
        let mut conn = self.tx().await?;

        super::update_erc20_metadata(address, chain_id, metadata)
            .execute(&mut *conn)
            .await?;

        conn.commit().await?;
        Ok(())
    }

    pub async fn get_erc20_balances(
        &self,
        chain_id: u32,
        address: Address,
    ) -> Result<Vec<TokenBalance>> {
        let res: Vec<_> = sqlx::query(
            r#"SELECT balances.contract, balances.balance, meta.decimals, meta.name, meta.symbol
            FROM balances
            LEFT JOIN tokens_metadata AS meta
              ON meta.chain_id = balances.chain_id AND meta.contract = balances.contract
            WHERE balances.chain_id = ? AND balances.owner = ? "#,
        )
        .bind(chain_id)
        .bind(format!("0x{:x}", address))
        .map(|row| row.try_into().unwrap())
        .fetch_all(self.pool())
        .await?;

        Ok(res)
    }

    pub async fn get_erc20_missing_metadata(&self, chain_id: u32) -> Result<Vec<Address>> {
        let res: Vec<_> = sqlx::query(
            r#"SELECT DISTINCT balances.contract
        FROM balances
        LEFT JOIN tokens_metadata AS meta
          ON meta.chain_id = balances.chain_id AND meta.contract = balances.contract
        WHERE balances.chain_id = ? AND meta.chain_id IS NULL"#,
        )
        .bind(chain_id)
        .map(|row| Address::from_str(row.get::<&str, _>("contract")).unwrap())
        .fetch_all(self.pool())
        .await?;

        Ok(res)
    }
}
