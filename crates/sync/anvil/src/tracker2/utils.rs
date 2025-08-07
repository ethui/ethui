use alloy::providers::{Provider as _, ProviderBuilder};
use ethui_types::prelude::*;

use crate::tracker2::worker::SyncInfo;

/// Generic function to connect and get block information from any provider URL
pub(crate) async fn try_get_sync_info(url: &str) -> Result<SyncInfo> {
    let provider = ProviderBuilder::new().connect(url).await?;

    // Get the latest block
    let block = provider
        .get_block_by_number(alloy::rpc::types::BlockNumberOrTag::Latest)
        .await?
        .with_context(|| format!("Failed to get latest block from {url}"))?;

    // Try to get fork block number from anvil_nodeInfo
    let fork_block_number = provider
        .client()
        .request::<(), serde_json::Value>("anvil_nodeInfo", ())
        .await?
        .get("forkBlockNumber")
        .and_then(|v| v.as_u64());

    Ok(SyncInfo {
        number: block.header.number,
        hash: block.header.hash,
        fork_block_number,
    })
}
