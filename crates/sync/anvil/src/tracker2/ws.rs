use alloy::{
    network::Ethereum,
    providers::{ext::TraceApi, Provider as _, ProviderBuilder, RootProvider},
};
use ethui_types::{prelude::*, Network};
use futures::{stream, Stream, StreamExt};
use tracing::debug;

use crate::tracker2::{
    anvil::AnvilProvider,
    worker::{Msg, SyncInfo},
};

#[derive(Clone)]
pub struct AnvilWs {
    network: Network,
}

impl AnvilWs {
    pub fn new(network: Network) -> Self {
        Self { network }
    }

    async fn try_connect_and_get_block(&self, url: &str) -> Result<SyncInfo> {
        let provider = ProviderBuilder::new().connect(url).await?;

        // Get the latest block
        let block = provider
            .get_block_by_number(alloy::rpc::types::BlockNumberOrTag::Latest)
            .await?
            .ok_or_else(|| eyre!("Failed to get latest block"))?;

        // Try to get fork block number from anvil_nodeInfo
        let fork_block_number = match provider
            .client()
            .request::<(), serde_json::Value>("anvil_nodeInfo", ())
            .await
        {
            Ok(node_info) => {
                // Parse the JSON response to extract forkBlockNumber
                node_info.get("forkBlockNumber").and_then(|v| v.as_u64())
            }
            Err(_) => None, // Not an anvil node or method not available
        };

        Ok(SyncInfo {
            number: block.header.number,
            hash: block.header.hash,
            fork_block_number,
        })
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

    async fn subscribe_blocks(&self) -> Result<Box<dyn Stream<Item = Msg> + Send + Unpin>> {
        let provider = self.provider().await?;

        // Use subscribe_blocks for WebSocket subscriptions
        let subscription = provider.subscribe_blocks().await?;
        let stream = subscription.into_stream();

        debug!("ws block stream created");

        // Transform the stream to process each block and extract traces/logs
        let block_stream = stream
            .then(move |block_header| {
                let provider = provider.clone();
                async move {
                    let block_number = block_header.number;
                    let block_hash = block_header.hash;

                    debug!("processing block {}", block_number);

                    // Get the full block to access transactions
                    if let Ok(Some(block)) = provider.get_block_by_hash(block_hash).await {
                        // Fetch traces for all transactions in the block
                        let mut all_traces = Vec::new();
                        let mut all_logs = Vec::new();

                        // Get transaction hashes from the block
                        for tx_hash in block.transactions.hashes() {
                            // Fetch traces for this transaction
                            if let Ok(traces) = provider.trace_transaction(tx_hash).await {
                                all_traces.extend(traces);
                            }

                            // Fetch receipt to get logs
                            if let Ok(Some(receipt)) =
                                provider.get_transaction_receipt(tx_hash).await
                            {
                                all_logs.extend(receipt.inner.logs().iter().cloned());
                            }
                        }

                        // Create the block data message
                        let msg = Msg::BlockData {
                            block_number,
                            block_hash,
                            traces: all_traces,
                            logs: all_logs,
                        };

                        Some(msg)
                    } else {
                        None
                    }
                }
            })
            .filter_map(|msg| async move { msg });

        Ok(Box::new(Box::pin(block_stream)))
    }

    async fn backfill_blocks(
        &self,
        sync_info: &SyncInfo,
    ) -> Result<Box<dyn Stream<Item = Msg> + Send + Unpin>> {
        let provider = self.provider().await?;

        // Determine starting block number: fork_block_number + 1 or 1
        let start_block = sync_info.fork_block_number.map(|fb| fb + 1).unwrap_or(1);
        let end_block = sync_info.number;

        debug!("ws historical stream {}-{}", start_block, end_block);

        // Create a stream that yields blocks sequentially from start to end
        let block_range = start_block..=end_block;
        let historical_stream = stream::iter(block_range)
            .then(move |block_number| {
                let provider = provider.clone();
                async move {
                    debug!("fetching block {}", block_number);

                    // Get the block by number
                    if let Ok(Some(block)) = provider.get_block_by_number(block_number.into()).await
                    {
                        let block_hash = block.header.hash;

                        // Fetch traces for all transactions in the block
                        let mut all_traces = Vec::new();
                        let mut all_logs = Vec::new();

                        // Get transaction hashes from the block
                        for tx_hash in block.transactions.hashes() {
                            // Fetch traces for this transaction
                            if let Ok(traces) = provider.trace_transaction(tx_hash).await {
                                all_traces.extend(traces);
                            }

                            // Fetch receipt to get logs
                            if let Ok(Some(receipt)) =
                                provider.get_transaction_receipt(tx_hash).await
                            {
                                all_logs.extend(receipt.inner.logs().iter().cloned());
                            }
                        }

                        // Create the block data message
                        let msg = Msg::BlockData {
                            block_number,
                            block_hash,
                            traces: all_traces,
                            logs: all_logs,
                        };

                        Some(msg)
                    } else {
                        debug!("failed to fetch block {}", block_number);
                        None
                    }
                }
            })
            .filter_map(|msg| async move { msg });

        Ok(Box::new(Box::pin(historical_stream)))
    }
}
