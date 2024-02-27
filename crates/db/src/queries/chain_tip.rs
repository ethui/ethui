use crate::{Result, DB};
use iron_types::Address;
use tracing::instrument;

impl DB {
    pub async fn get_tip(&self, chain_id: u32, addr: Address) -> Result<u64> {
        let tip = super::get_tip(addr, chain_id)
            .fetch_one(self.pool())
            .await
            .unwrap_or_default();

        Ok(tip)
    }

    #[instrument(skip(self), level = "trace")]
    pub async fn set_tip(&self, chain_id: u32, addr: Address, tip: u64) -> Result<()> {
        super::set_tip(addr, chain_id, tip)
            .execute(self.pool())
            .await?;

        Ok(())
    }
}
