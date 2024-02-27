use iron_types::{Address, U256};
use sqlx::Row;

use crate::{Result, DB};

impl DB {
    pub async fn save_native_balance(
        &self,
        balance: U256,
        chain_id: u32,
        address: Address,
    ) -> Result<()> {
        sqlx::query(
            r#" INSERT OR REPLACE INTO native_balances (balance, chain_id, owner)
                        VALUES (?,?,?) "#,
        )
        .bind(balance.to_string())
        .bind(chain_id)
        .bind(format!("0x{:x}", address))
        .execute(self.pool())
        .await?;

        Ok(())
    }

    pub async fn get_native_balance(&self, chain_id: u32, address: Address) -> U256 {
        let res: U256 = sqlx::query(
            r#" SELECT balance
            FROM native_balances
            WHERE chain_id = ? AND owner = ? "#,
        )
        .bind(chain_id)
        .bind(format!("0x{:x}", address))
        .map(|row| U256::from_str_radix(row.get::<&str, _>("balance"), 10).unwrap())
        .fetch_one(self.pool())
        .await
        .unwrap_or_default();

        res
    }
}
