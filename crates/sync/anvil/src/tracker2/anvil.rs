use std::hash::{Hash, Hasher};

use alloy::{network::Ethereum, primitives::map::DefaultHasher, providers::RootProvider};
use ethui_types::{prelude::*, Network};
use futures::Stream;

use super::worker::{Msg, SyncInfo};

#[allow(async_fn_in_trait)]
pub trait AnvilProvider {
    fn network(&self) -> &Network;
    async fn wait_until_available(&mut self) -> Result<SyncInfo>;
    async fn provider(&self) -> Result<RootProvider<Ethereum>>;
    fn block_stream(
        &self,
    ) -> impl Future<Output = Result<Box<dyn Stream<Item = Msg> + Send + Unpin>>>;
    async fn historical_blocks_stream(
        &self,
        sync_info: &SyncInfo,
    ) -> Result<Box<dyn Stream<Item = Msg> + Send + Unpin>>;

    fn random_jitter(&self, name: &str, max_jitter: u64, retry_count: u32) -> u64 {
        // Create a simple pseudo-random number based on network name and retry count
        let mut hasher = DefaultHasher::new();
        name.hash(&mut hasher);
        retry_count.hash(&mut hasher);

        // Use current time as additional entropy
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos() as u64;
        now.hash(&mut hasher);

        let hash_value = hasher.finish();
        hash_value % (max_jitter + 1)
    }
}

