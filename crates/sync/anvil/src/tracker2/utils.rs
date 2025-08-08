use std::{
    collections::hash_map::DefaultHasher,
    hash::{Hash, Hasher},
    time::{SystemTime, UNIX_EPOCH},
};

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

/// Generate deterministic pseudo-random jitter for retry delays
pub(crate) fn random_jitter(seed: &str, max_jitter: u64, retry_count: u32) -> u64 {
    let mut hasher = DefaultHasher::new();
    seed.hash(&mut hasher);
    retry_count.hash(&mut hasher);

    // Add some time-based entropy to avoid all instances having the same jitter
    if let Ok(duration) = SystemTime::now().duration_since(UNIX_EPOCH) {
        (duration.as_millis() % 1000).hash(&mut hasher);
    }

    let hash = hasher.finish();
    hash % max_jitter
}
