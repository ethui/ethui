use std::str::FromStr;

use iron_types::{Address, TokenBalance, TokenMetadata, U256};
use sqlx::sqlite::SqliteRow;
use sqlx::Row;
use tracing::instrument;

use crate::{Result, DB};

impl DB {
    pub async fn read_erc20_balance(
        &self,
        chain_id: u32,
        contract: Address,
        address: Address,
    ) -> Result<U256> {
        let balance = sqlx::query(
            r#"SELECT balance FROM balances WHERE chain_id = ? AND contract = ? AND owner = ?"#,
        )
        .bind(chain_id)
        .bind(format!("0x{:x}", contract))
        .bind(format!("0x{:x}", address))
        .map(|r: SqliteRow| {
            U256::from_str_radix(r.get::<&str, _>("balance"), 10).unwrap_or_default()
        })
        .fetch_one(self.pool())
        .await?;

        Ok(balance)
    }

    pub async fn save_erc20_balance(
        &self,
        chain_id: u32,
        contract: Address,
        address: Address,
        balance: U256,
    ) -> Result<()> {
        sqlx::query(
            r#" INSERT OR REPLACE INTO balances (chain_id, contract, owner, balance)
                        VALUES (?,?,?,?) "#,
        )
        .bind(chain_id)
        .bind(format!("0x{:x}", contract))
        .bind(format!("0x{:x}", address))
        .bind(balance.to_string())
        .execute(self.pool())
        .await?;

        Ok(())
    }

    pub async fn save_erc20_balances(
        &self,
        chain_id: u32,
        address: Address,
        balances: Vec<(Address, U256)>,
    ) -> Result<()> {
        for (contract, balance) in balances {
            self.save_erc20_balance(chain_id, contract, address, balance)
                .await?;
        }

        Ok(())
    }

    #[instrument(level = "trace", skip(self))]
    pub async fn process_erc20_transfer(
        &self,
        chain_id: u32,
        contract: Address,
        from: Address,
        to: Address,
        value: U256,
    ) -> Result<()> {
        // update from's balance
        if !from.is_zero() {
            let current = self.read_erc20_balance(chain_id, contract, from).await?;
            self.save_erc20_balance(chain_id, contract, from, current - value)
                .await?;
        }

        // update to's balance
        if !to.is_zero() {
            let current = self
                .read_erc20_balance(chain_id, contract, to)
                .await
                .unwrap_or_default();
            self.save_erc20_balance(chain_id, contract, to, current + value)
                .await?;
        }

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

    pub async fn get_erc20_metadata(
        &self,
        contract: Address,
        chain_id: u32,
    ) -> Result<TokenMetadata> {
        let metadata = sqlx::query(
            r#"SELECT decimals, name, symbol
        FROM tokens_metadata
        WHERE contract = ? AND chain_id = ?"#,
        )
        .bind(format!("0x{:x}", contract))
        .bind(chain_id)
        .map(|row| row.try_into().unwrap())
        .fetch_one(self.pool())
        .await?;

        Ok(metadata)
    }

    pub async fn save_erc20_metadata(
        &self,
        address: Address,
        chain_id: u32,
        metadata: TokenMetadata,
    ) -> Result<()> {
        sqlx::query(
            r#" INSERT OR REPLACE INTO tokens_metadata (contract, chain_id, decimals, name,symbol)
                        VALUES (?,?,?,?,?) "#,
        )
        .bind(format!("0x{:x}", address))
        .bind(chain_id)
        .bind(metadata.decimals)
        .bind(metadata.name)
        .bind(metadata.symbol)
        .execute(self.pool())
        .await?;

        Ok(())
    }
}
