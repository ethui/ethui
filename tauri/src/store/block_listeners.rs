use async_trait::async_trait;
use sqlx::sqlite::SqliteRow;
use sqlx::Row;

use crate::db::DB;
use crate::error::Result;

#[async_trait]
pub trait BlockListenerStore {
    async fn get_last_known_block(&self, network: &str) -> Result<u32>;
    async fn set_last_known_block(&self, network: &str, block: u32) -> Result<()>;
}

#[async_trait]
impl BlockListenerStore for DB {
    async fn get_last_known_block(&self, network: &str) -> Result<u32> {
        let mut conn = self.conn().await?;

        let res: Option<u32> = sqlx::query(
            r#"
            SELECT block 
            FROM last_known_block 
            WHERE network = ?
            "#,
        )
        .bind(network)
        .map(|row: SqliteRow| row.get("block"))
        .fetch_one(&mut conn)
        .await?;

        Ok(res.unwrap_or(0))
    }

    async fn set_last_known_block(&self, network: &str, block: u32) -> Result<()> {
        let mut conn = self.conn().await?;

        sqlx::query(
            r#"
            INSERT INTO last_known_block (network, last_known_block) 
            VALUES (?, ?) ON CONFLICT(network) 
            DO UPDATE SET block = ?
            "#,
        )
        .bind(network)
        .bind(block)
        .bind(block)
        .execute(&mut conn)
        .await?;

        Ok(())
    }
}
