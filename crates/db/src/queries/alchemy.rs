use iron_types::alchemy::AlchemyAssetTransfer;

use crate::{Db, Result};

impl Db {
    pub async fn save_alchemy_transfers(&self, transfers: Vec<AlchemyAssetTransfer>) -> Result<()> {
        todo!()
    }
}
