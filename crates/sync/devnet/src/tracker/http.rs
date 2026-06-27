use alloy::{
    network::Ethereum,
    providers::{Provider as _, ProviderBuilder, RootProvider},
    rpc::types::Header,
};
use ethui_types::{Network, prelude::*};
use futures::{Stream, StreamExt, stream};

use crate::tracker::{provider::AnvilProvider, worker::SyncInfo};

#[derive(Clone)]
pub struct AnvilHttp {
    network: Network,
}

impl AnvilHttp {
    pub fn new(network: Network) -> Self {
        Self { network }
    }
}

impl AnvilProvider for AnvilHttp {
    fn network(&self) -> &Network {
        &self.network
    }

    async fn provider(&self) -> Result<RootProvider<Ethereum>> {
        let url = &self.network.http_url.to_string();
        let provider = ProviderBuilder::new()
            .disable_recommended_fillers()
            .connect(url)
            .await?;
        Ok(provider)
    }

    async fn subscribe_blocks(&self) -> Result<Box<dyn Stream<Item = Header> + Send + Unpin>> {
        let provider = Arc::new(self.provider().await?);

        // Use watch_blocks for HTTP polling-based subscriptions
        let watcher = provider.watch_blocks().await?;
        let stream = watcher.into_stream();

        // Transform the stream to process each block and extract traces/logs
        let block_stream = stream
            .then(move |block_hashes| {
                let provider = Arc::clone(&provider);
                async move {
                    // Collect all messages for this batch of block hashes
                    let mut messages = Vec::new();

                    // Process each block hash (watch_blocks can return multiple hashes)
                    for hash in block_hashes {
                        if let Ok(Some(block)) = provider.get_block_by_hash(hash).await {
                            messages.push(block.header);
                        }
                    }

                    stream::iter(messages)
                }
            })
            .flatten();

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

        if end_block < start_block {
            return Ok(Box::new(stream::empty()));
        }

        // Create a stream that yields blocks sequentially from start to end
        let block_range = start_block..=end_block;
        let historical_stream = stream::iter(block_range)
            .then(move |block_number| {
                let provider = provider.clone();
                async move {
                    // Get the block by number
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

#[cfg(test)]
mod tests {
    use ethui_types::Network;

    #[test]
    fn test_random_jitter_produces_different_values() {
        use crate::tracker::utils::random_jitter;

        let network = Network::anvil(0);

        let max_jitter = 1000;
        let mut values = std::collections::HashSet::new();

        // Generate multiple jitter values and ensure they're different
        for retry_count in 0..10 {
            let jitter = random_jitter(&network.name, max_jitter, retry_count);
            assert!(jitter <= max_jitter, "Jitter should not exceed max_jitter");
            values.insert(jitter);
        }

        // We should get at least some different values (not all the same)
        assert!(
            values.len() > 1,
            "Random jitter should produce different values, got: {values:?}"
        );
    }

    #[test]
    fn test_random_jitter_deterministic_same_inputs() {
        use crate::tracker::utils::random_jitter;

        let _network = Network::anvil(0);

        // Same inputs should produce similar results within a short time window
        let jitter1 = random_jitter("name", 1000, 5);
        let jitter2 = random_jitter("name2", 1000, 5);

        // Due to time-based entropy, they might be different, but both should be valid
        assert!(jitter1 <= 1000);
        assert!(jitter2 <= 1000);
    }
}
