use crate::{Result, DB};
use iron_types::Address;
use sqlx::sqlite::SqliteRow;
use sqlx::Row;
use tracing::instrument;

impl DB {
    pub async fn get_tip(&self, chain_id: u32, addr: Address) -> Result<u64> {
        let tip = sqlx::query(r#"SELECT tip FROM tips WHERE owner = ? AND chain_id = ?"#)
            .bind(format!("0x{:x}", addr))
            .bind(chain_id)
            .map(|r: SqliteRow| {
                let tip_str = r
                    .get::<Option<&str>, _>("tip")
                    .unwrap_or("0x0")
                    .trim_start_matches("0x");
                u64::from_str_radix(tip_str, 16).unwrap_or(0)
            })
            .fetch_one(self.pool())
            .await
            .unwrap_or_default();

        Ok(tip)
    }

    #[instrument(skip(self), level = "trace")]
    pub async fn set_tip(&self, chain_id: u32, addr: Address, tip: u64) -> Result<()> {
        sqlx::query(
            r#"INSERT OR REPLACE INTO tips (owner, chain_id, tip) 
        VALUES (?,?,?) "#,
        )
        .bind(format!("0x{:x}", addr))
        .bind(chain_id)
        .bind(format!("0x{:x}", tip))
        .execute(self.pool())
        .await?;

        Ok(())
    }
}
