use ethui_types::prelude::*;

use crate::DbInner;

impl DbInner {
    pub async fn get_tip(&self, chain_id: u64, addr: Address) -> Result<u64> {
        let chain_id = chain_id as u32;
        let addr = addr.to_string();

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
    pub async fn set_tip(&self, chain_id: u64, addr: Address, tip: u64) -> Result<()> {
        let addr = addr.to_string();
        let tip = format!("0x{tip:x}");
        let chain_id = chain_id as u32;

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
