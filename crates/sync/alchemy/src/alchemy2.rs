use iron_types::{Address, ToEthers, U64};

use crate::{
    client::{Client, Direction},
    Result,
};

pub async fn fetch_transactions(api_key: &str, chain_id: u32, address: Address) -> Result<()> {
    let client = Client::new(chain_id, api_key)?;
    let db = iron_db::get();

    let last_tip: u64 = db.kv_get(&(chain_id, address)).await?.unwrap_or_default();

    let from_block = U64::from(last_tip);
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

    let tip = out
        .iter()
        .chain(inc.iter())
        .map(|tx| tx.block_num.to_ethers().as_u64())
        .fold(std::u64::MIN, |a, b| a.max(b));

    db.save_alchemy_transfers(chain_id, inc).await?;
    db.save_alchemy_transfers(chain_id, out).await?;

    if tip > std::u64::MIN {
        db.kv_set(&(chain_id, address), &tip).await?;
    }

    Ok(())
}
