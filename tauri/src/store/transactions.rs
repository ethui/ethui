use async_trait::async_trait;
use ethers::types::{Address, Transaction};
use log::debug;
use sqlx::sqlite::SqliteRow;
use sqlx::Row;

use crate::db::DB;
use crate::error::Result;

#[async_trait]
pub trait TransactionStore {
    async fn truncate_transactions(&self) -> Result<()>;
    async fn save_transactions(&self, tx: Vec<Transaction>) -> Result<()>;

    // TODO: should maybe return Vec<H256> here
    async fn get_transactions(&self, from_or_to: Address) -> Result<Vec<String>>;
}

#[async_trait]
impl TransactionStore for DB {
    async fn save_transactions(&self, txs: Vec<Transaction>) -> Result<()> {
        let mut conn = self.conn().await?;

        // TODO: batch this in a single query
        for tx in txs.iter() {
            // TODO: chain_name must come from caller
            sqlx::query(
                r#"
            INSERT INTO transactions (hash, chain_name, from_address, to_address)
            VALUES (?,?,?,?)
            "#,
            )
            .bind(format!("0x{:x}", tx.hash))
            .bind("anvil")
            .bind(format!("0x{:x}", tx.from))
            .bind(format!("0x{:x}", tx.to.unwrap_or_default()))
            .execute(&mut conn)
            .await?;
            // TODO: report this errors in await?. Currently they're being silently ignored, because the task just gets killed
        }

        Ok(())
    }

    async fn get_transactions(&self, from_or_to: Address) -> Result<Vec<String>> {
        let mut conn = self.conn().await?;

        let res: Vec<String> =
            sqlx::query(r#"SELECT hash FROM transactions WHERE from_address = ? or to_address = ? COLLATE NOCASE"#)
                .bind(format!("0x{:x}", from_or_to))
                .map(|row: SqliteRow| row.get("hash"))
                .fetch_all(&mut conn)
                .await?;

        Ok(res)
    }

    async fn truncate_transactions(&self) -> Result<()> {
        debug!("truncating transactions");

        sqlx::query("DELETE FROM transactions")
            .execute(&mut self.conn().await?)
            .await?;

        Ok(())
    }
}
