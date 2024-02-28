use std::path::PathBuf;

use iron_types::{Address, Event, U64};

use crate::{
    client::{Client, Direction},
    networks::default_from_block,
    Result,
};

pub async fn fetch_transactions(api_key: &str, chain_id: u32, address: Address) -> Result<()> {
    let client = Client::new(chain_id, api_key)?;
    let db = iron_db::get();
    let kv = iron_kv::Kv::<(u32, Address), u64>::open(PathBuf::from(
        "sync/alchemy/transaction_tips.json",
    ));

    let from_block: U64 = U64::from(
        kv.get(&(chain_id, address))
            .cloned()
            .unwrap_or_else(|| default_from_block(chain_id)),
    );

    let latest = client.get_block_number().await?;

    // if tip - 1 == latest, we're up to date, nothing to do
    if from_block.saturating_sub(U64::from(1)) == latest {
        return Ok(());
    }

    let inc = client
        .get_asset_transfers(Direction::From(address), from_block, latest)
        .await?;
    let out = client
        .get_asset_transfers(Direction::To(address), from_block, latest)
        .await?;

    db.save_alchemy_transfers(inc).await?;
    db.save_alchemy_transfers(out).await?;

    Ok(())
}
