use async_trait::async_trait;
use ethers::types::{Address, Transaction};
use sqlx::sqlite::SqliteRow;
use sqlx::Row;

use crate::db::DB;
use crate::error::Result;

#[async_trait]
pub trait TransactionStore {
    async fn truncate_transactions(&self, chain_id: u32) -> Result<()>;
    async fn save_transactions(&self, chain_id: u32, tx: Vec<Transaction>) -> Result<()>;

    // TODO: should maybe return Vec<H256> here
    async fn get_transactions(&self, from_or_to: Address) -> Result<Vec<String>>;
}

#[async_trait]
impl TransactionStore for DB {
    async fn save_transactions(&self, chain_id: u32, txs: Vec<Transaction>) -> Result<()> {
        let mut conn = self.tx().await?;

        for tx in txs.iter() {
            sqlx::query(
                r#"
            INSERT INTO transactions (hash, chain_id, from_address, to_address)
            VALUES (?,?,?,?)
            ON CONFLICT(hash) DO NOTHING
            "#,
            )
            .bind(format!("0x{:x}", tx.hash))
            .bind(chain_id)
            .bind(format!("0x{:x}", tx.from))
            .bind(format!("0x{:x}", tx.to.unwrap_or_default()))
            .execute(&mut conn)
            .await?;
            // TODO: report this errors in await?. Currently they're being silently ignored, because the task just gets killed
        }

        conn.commit().await?;

        Ok(())
    }

    async fn get_transactions(&self, from_or_to: Address) -> Result<Vec<String>> {
        let res: Vec<String> =
            sqlx::query(r#"SELECT hash FROM transactions WHERE from_address = ? or to_address = ? COLLATE NOCASE"#)
                .bind(format!("0x{:x}", from_or_to))
                .map(|row: SqliteRow| row.get("hash"))
                .fetch_all(self.pool())
                .await?;

        Ok(res)
    }

    async fn truncate_transactions(&self, chain_id: u32) -> Result<()> {
        sqlx::query("DELETE FROM transactions WHERE chain_id = ?")
            .bind(chain_id)
            .execute(self.pool())
            .await?;

        Ok(())
    }
}
