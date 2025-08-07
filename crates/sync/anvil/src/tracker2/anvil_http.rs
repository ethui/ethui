use std::sync::Arc;

use alloy::{
    network::Ethereum,
    providers::{ext::TraceApi, Provider as _, ProviderBuilder, RootProvider},
};
use ethui_types::{prelude::*, Network};
use futures::{future::Either, stream, Stream, StreamExt, TryStreamExt};
use tokio::{
    sync::{oneshot, watch, Mutex},
    time::{interval, sleep, timeout, Duration},
};
use tracing::{debug, instrument};

use crate::tracker2::{
    anvil::AnvilProvider,
    worker::{Msg, SyncInfo},
};

#[derive(Clone)]
pub struct AnvilHttp {
    network: Network,
    latest_block: Arc<Mutex<Option<(u64, B256)>>>, // (block_number, block_hash)
}

impl AnvilHttp {
    pub fn new(network: Network) -> Self {
        Self {
            network,
            latest_block: Arc::new(Mutex::new(None)),
        }
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

    /// Monitor connection health using HTTP/1.1 keep-alive
    async fn monitor_connection(url: String, connection_lost_tx: oneshot::Sender<()>) {
        debug!("starting TCP connection monitor for {}", url);

        // Create a raw HTTP client with keep-alive enabled (fast timeouts for local testing)
        let client = reqwest::Client::builder()
            .tcp_keepalive(Some(Duration::from_secs(1)))
            .pool_idle_timeout(Some(Duration::from_secs(2)))
            .pool_max_idle_per_host(1)
            .timeout(Duration::from_secs(2))
            .build()
            .expect("Failed to create HTTP client");

        // Establish initial connection with a simple JSON-RPC request
        let initial_request = serde_json::json!({
            "jsonrpc": "2.0",
            "method": "eth_blockNumber",
            "params": [],
            "id": 1
        });

        match client
            .post(&url)
            .header("Content-Type", "application/json")
            .header("Connection", "keep-alive")
            .json(&initial_request)
            .send()
            .await
        {
            Ok(response) => {
                debug!("established keep-alive connection: {}", response.status());
            }
            Err(e) => {
                debug!("failed to establish initial connection: {}", e);
                let _ = connection_lost_tx.send(());
                return;
            }
        }

        // Now periodically send minimal keep-alive requests
        let mut interval = interval(Duration::from_secs(1));

        loop {
            interval.tick().await;

            // Send minimal JSON-RPC request to maintain connection
            let keep_alive_request = serde_json::json!({
                "jsonrpc": "2.0",
                "method": "net_version",
                "params": [],
                "id": 2
            });

            match timeout(
                Duration::from_secs(1), // Fast timeout for local testing
                client
                    .post(&url)
                    .header("Content-Type", "application/json")
                    .header("Connection", "keep-alive")
                    .json(&keep_alive_request)
                    .send(),
            )
            .await
            {
                Ok(Ok(response)) => {
                    if !response.status().is_success() {
                        debug!("connection monitor: HTTP error {}", response.status());
                        let _ = connection_lost_tx.send(());
                        break;
                    }
                    // Connection is alive, continue monitoring
                }
                Ok(Err(e)) => {
                    debug!("connection monitor: request failed: {}", e);
                    let _ = connection_lost_tx.send(());
                    break;
                }
                Err(_) => {
                    debug!("connection monitor: request timeout");
                    let _ = connection_lost_tx.send(());
                    break;
                }
            }
        }

        debug!("TCP connection monitor stopped");
    }
}

/// Validate chain continuity and update latest block
async fn validate_and_update_latest_block(
    latest_block: &Arc<Mutex<Option<(u64, B256)>>>,
    provider: &RootProvider<Ethereum>,
    new_block_number: u64,
    new_block_hash: B256,
) -> Result<bool> {
    let mut latest_guard = latest_block.lock().await;

    // Check if we have a previous block to validate
    if let Some((prev_number, prev_hash)) = *latest_guard {
        // Verify the previous block still exists (chain continuity check)
        if let Ok(Some(prev_block)) = provider.get_block_by_number(prev_number.into()).await {
            if prev_block.header.hash != prev_hash {
                debug!(
                    "chain reorg detected: block {} hash changed from {} to {}",
                    prev_number, prev_hash, prev_block.header.hash
                );
                // Reset and let caller handle reorg
                *latest_guard = None;
                return Ok(false);
            }
        } else {
            debug!("previous block {} no longer exists", prev_number);
            // Previous block disappeared, likely chain restart
            *latest_guard = None;
            return Ok(false);
        }
    }

    // Update to new latest block
    *latest_guard = Some((new_block_number, new_block_hash));
    debug!(
        "updated latest block to {} ({})",
        new_block_number, new_block_hash
    );
    Ok(true)
}

impl AnvilProvider for AnvilHttp {
    fn network(&self) -> &Network {
        &self.network
    }

    #[instrument(skip_all, fields(network = self.network.name))]
    async fn wait_until_available(&mut self) -> Result<SyncInfo> {
        let url = self.network.http_url.to_string();

        // Retry logic with exponential backoff (fast for local testing)
        let mut retry_count = 0;
        const MAX_RETRIES: u32 = 5; // Fewer retries for local testing
        const BASE_DELAY: u64 = 50; // milliseconds - faster retry

        loop {
            if let Ok(Ok(block_info)) =
                timeout(Duration::from_secs(2), self.try_connect_and_get_block(&url)).await
            {
                debug!("http node available at block {}", block_info.number);
                return Ok(block_info);
            }

            retry_count += 1;
            if retry_count >= MAX_RETRIES {
                return Err(eyre!(
                    "HTTP node not available after {} retries",
                    MAX_RETRIES
                ));
            }

            // Exponential backoff with random jitter
            let delay = BASE_DELAY * (2_u64.pow(retry_count.min(6))); // Cap at 64x base delay
            let jitter = self.random_jitter(&self.network.name, delay / 4, retry_count); // Up to 25% jitter
            sleep(Duration::from_millis(delay + jitter)).await;
        }
    }

    async fn provider(&self) -> Result<RootProvider<Ethereum>> {
        let url = &self.network.http_url.to_string();
        let provider = ProviderBuilder::new()
            .disable_recommended_fillers()
            .connect(url)
            .await?;
        Ok(provider)
    }

    async fn block_stream(&self) -> Result<Box<dyn Stream<Item = Msg> + Send + Unpin>> {
        let provider = self.provider().await?;

        // Create connection monitoring
        let (connection_lost_tx, connection_lost_rx) = oneshot::channel();
        let monitor_url = self.network.http_url.to_string();

        // Spawn background task to monitor TCP connection health
        tokio::spawn(async move {
            Self::monitor_connection(monitor_url, connection_lost_tx).await;
        });

        // Use watch_blocks for HTTP polling-based subscriptions
        let watcher = provider.watch_blocks().await?;
        let stream = watcher.into_stream();

        debug!("http block stream created with TCP monitoring");

        // Transform the stream to process each block and extract traces/logs
        let latest_block = self.latest_block.clone();
        let block_stream = stream
            .then(move |block_hashes| {
                let provider = provider.clone();
                let latest_block = latest_block.clone();
                async move {
                    // Collect all messages for this batch of block hashes
                    let mut messages = Vec::new();

                    // Process each block hash (watch_blocks can return multiple hashes)
                    for block_hash in block_hashes {
                        if let Ok(Some(block)) = provider.get_block_by_hash(block_hash).await {
                            let block_number = block.header.number;

                            debug!("processing block {}", block_number);

                            // Validate chain continuity and update latest block
                            if let Ok(is_valid) = validate_and_update_latest_block(
                                &latest_block,
                                &provider,
                                block_number,
                                block_hash,
                            )
                            .await
                            {
                                if !is_valid {
                                    debug!("chain continuity broken, skipping block processing");
                                    continue;
                                }
                            }

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

                            messages.push(msg);
                        }
                    }

                    stream::iter(messages)
                }
            })
            .flatten();

        // For now, let the TCP monitor detect connection loss
        // The worker's timeout will handle restarting if needed
        // TODO: We can add stream termination later once the basic flow works
        drop(connection_lost_rx); // Don't use complex termination for now

        Ok(Box::new(Box::pin(block_stream)))
    }

    async fn historical_blocks_stream(
        &self,
        sync_info: &SyncInfo,
    ) -> Result<Box<dyn Stream<Item = Msg> + Send + Unpin>> {
        let provider = self.provider().await?;

        // Determine starting block number: fork_block_number + 1 or 1
        let start_block = sync_info.fork_block_number.unwrap_or_default() + 1;
        let end_block = sync_info.number;
        dbg!(&sync_info);

        debug!("http historical stream {}-{}", start_block, end_block);

        if end_block < start_block {
            dbg!("empty");
            return Ok(Box::new(stream::empty()));
        }

        // Create a stream that yields blocks sequentially from start to end
        let block_range = start_block..=end_block;
        let latest_block = self.latest_block.clone();
        let historical_stream = stream::iter(block_range)
            .then(move |block_number| {
                let provider = provider.clone();
                let latest_block = latest_block.clone();
                async move {
                    debug!("fetching block {}", block_number);

                    // Get the block by number
                    if let Ok(Some(block)) = provider.get_block_by_number(block_number.into()).await
                    {
                        let block_hash = block.header.hash;

                        // Validate chain continuity and update latest block
                        if let Ok(is_valid) = validate_and_update_latest_block(&latest_block, &provider, block_number, block_hash).await {
                            if !is_valid {
                                debug!("chain continuity broken during historical sync, skipping block");
                                return None;
                            }
                        }

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

#[cfg(test)]
mod tests {
    use ethui_types::Network;

    use super::*;

    #[test]
    fn test_random_jitter_produces_different_values() {
        let network = Network::anvil(0);
        let worker = AnvilHttp::new(network.clone());

        let max_jitter = 1000;
        let mut values = std::collections::HashSet::new();

        // Generate multiple jitter values and ensure they're different
        for retry_count in 0..10 {
            let jitter = worker.random_jitter(&network.name, max_jitter, retry_count);
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
        let network = Network::anvil(0);
        let worker = AnvilHttp::new(network);

        // Same inputs should produce similar results within a short time window
        let jitter1 = worker.random_jitter("name", 1000, 5);
        let jitter2 = worker.random_jitter("name2", 1000, 5);

        // Due to time-based entropy, they might be different, but both should be valid
        assert!(jitter1 <= 1000);
        assert!(jitter2 <= 1000);
    }
}
