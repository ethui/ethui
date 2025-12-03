use common::{Address, U256};

use crate::DbInner;

impl DbInner {
    pub async fn save_native_balance(
        &self,
        balance: U256,
        chain_id: u32,
        address: Address,
    ) -> color_eyre::Result<()> {
        let balance = balance.to_string();
        let address = format!("0x{address:x}");

        sqlx::query!(
            r#" INSERT OR REPLACE INTO native_balances (balance, chain_id, owner)
                        VALUES (?,?,?) "#,
            balance,
            chain_id,
            address
        )
        .execute(self.pool())
        .await?;

        Ok(())
    }

    pub async fn get_native_balance(&self, chain_id: u32, address: Address) -> U256 {
        let address = address.to_string();

        let res = sqlx::query!(
            r#" SELECT balance
            FROM native_balances
            WHERE chain_id = ? AND owner = ? "#,
            chain_id,
            address
        )
        .fetch_one(self.pool())
        .await;

        if let Ok(res) = res {
            U256::from_str_radix(&res.balance, 10).unwrap_or_default()
        } else {
            U256::default()
        }
    }
}
