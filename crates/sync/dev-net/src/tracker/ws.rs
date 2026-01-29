use alloy::{
    network::Ethereum,
    providers::{Provider as _, ProviderBuilder, RootProvider},
    rpc::types::Header,
};
use ethui_types::{prelude::*, Network};
use futures::{stream, Stream, StreamExt};

use crate::tracker::{provider::AnvilProvider, worker::SyncInfo};

#[derive(Clone)]
pub struct AnvilWs {
    network: Network,
}

impl AnvilWs {
    pub fn new(network: Network) -> Self {
        Self { network }
    }
}

impl AnvilProvider for AnvilWs {
    fn network(&self) -> &Network {
        &self.network
    }

    async fn provider(&self) -> Result<RootProvider<Ethereum>> {
        let url = &self
            .network
            .ws_url
            .as_ref()
            .ok_or_else(|| eyre!("WebSocket URL not available"))?
            .to_string();
        let provider = ProviderBuilder::new()
            .disable_recommended_fillers()
            .connect(url)
            .await?;
        Ok(provider)
    }

    async fn subscribe_blocks(&self) -> Result<Box<dyn Stream<Item = Header> + Send + Unpin>> {
        let provider = Arc::new(self.provider().await?);

        // Use subscribe_blocks for WebSocket subscriptions
        let subscription = provider.subscribe_blocks().await?;
        let stream = subscription.into_stream();

        // Transform the stream to process each block and extract traces/logs
        let block_stream = stream.map(move |header| {
            let _provider = Arc::clone(&provider);
            header
        });

        Ok(Box::new(Box::pin(block_stream)))
    }

    async fn backfill_blocks(
        &self,
        sync_info: &SyncInfo,
    ) -> Result<Box<dyn Stream<Item = Header> + Send + Unpin>> {
        let provider = self.provider().await?;

        // Determine starting block number: fork_block_number + 1 or 1
        let start_block = sync_info.fork_block_number.map(|fb| fb + 1).unwrap_or(1);
        let end_block = sync_info.number;

        // Create a stream that yields blocks sequentially from start to end
        let block_range = start_block..=end_block;
        let historical_stream = stream::iter(block_range)
            .then(move |block_number| {
                let provider = provider.clone();
                async move {
                    if let Ok(Some(block)) = provider.get_block_by_number(block_number.into()).await
                    {
                        Some(block.header)
                    } else {
                        None
                    }
                }
            })
            .filter_map(|msg| async move { msg });

        Ok(Box::new(Box::pin(historical_stream)))
    }
}
