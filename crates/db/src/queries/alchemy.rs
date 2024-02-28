use iron_types::alchemy::AlchemyAssetTransfer;
use iron_types::ToEthers;

use crate::{Db, Result};

impl Db {
    pub async fn save_alchemy_transfers(
        &self,
        chain_id: u32,
        transfers: Vec<AlchemyAssetTransfer>,
    ) -> Result<()> {
        for transfer in transfers {
            let hash = format!("0x{:x}", transfer.hash);
            let from = format!("0x{:x}", transfer.from);
            let to = transfer.to.map(|a| format!("0x{:x}", a));
            let block_number = transfer.block_num.to_ethers().as_u64() as i64;

            sqlx::query!(
                r#" INSERT INTO transactions (hash, chain_id, from_address, to_address, block_number)
                    VALUES (?,?,?,?,?)
                    ON CONFLICT(hash) DO NOTHING "#,
                hash,
                chain_id,
                from,
                to,
                block_number
            )
            .execute(self.pool()).await?;
        }

        Ok(())
    }
}
