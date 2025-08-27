use alloy::{network::Ethereum, providers::RootProvider, rpc::types::Header};
use ethui_types::{prelude::*, Network};
use futures::Stream;

use super::worker::SyncInfo;

#[allow(async_fn_in_trait)]
pub trait AnvilProvider {
    fn network(&self) -> &Network;
    async fn provider(&self) -> Result<RootProvider<Ethereum>>;
    fn subscribe_blocks(
        &self,
    ) -> impl Future<Output = Result<Box<dyn Stream<Item = Header> + Send + Unpin>>>;
    async fn backfill_blocks(
        &self,
        sync_info: &SyncInfo,
    ) -> Result<Box<dyn Stream<Item = Header> + Send + Unpin>>;
}
