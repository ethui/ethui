use crate::{DbInner, Result};
use iron_types::Address;
use tracing::instrument;

impl DbInner {
    pub async fn get_tip(&self, chain_id: u32, addr: Address) -> Result<u64> {
        let addr = format!("0x{:x}", addr);

        let row = sqlx::query!(
            r#"SELECT tip FROM tips WHERE owner = ? AND chain_id = ?"#,
            addr,
            chain_id
        )
        .fetch_one(self.pool())
        .await?;

        Ok(u64::from_str_radix(row.tip.trim_start_matches("0x"), 16).unwrap_or(0))
    }

    #[instrument(skip(self), level = "trace")]
    pub async fn set_tip(&self, chain_id: u32, addr: Address, tip: u64) -> Result<()> {
        let addr = format!("0x{:x}", addr);
        let tip = format!("0x{:x}", tip);

        sqlx::query!(
            r#"INSERT OR REPLACE INTO tips (owner, chain_id, tip) 
                VALUES (?,?,?) "#,
            addr,
            chain_id,
            tip
        )
        .execute(self.pool())
        .await?;

        Ok(())
    }
}
