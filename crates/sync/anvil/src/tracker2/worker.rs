#![allow(dead_code)]

use alloy::{
    network::Ethereum,
    providers::{Provider, RootProvider},
    rpc::types::{eth::Block, trace::parity::LocalizedTransactionTrace, Log as RpcLog},
};
use ethui_types::{prelude::*, Network};
use futures::{Stream, StreamExt};
use tokio::{
    sync::{mpsc, oneshot},
    time::{sleep, timeout, Duration},
};
use tracing::{debug, instrument};

use crate::tracker2::{anvil::AnvilProvider, consumer::Consumer};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SyncInfo {
    pub number: u64,
    pub hash: B256,
    pub fork_block_number: Option<u64>,
}

#[derive(Debug)]
pub enum Msg {
    Reset,
    CaughtUp,
    BlockData {
        block_number: u64,
        block_hash: B256,
        traces: Vec<LocalizedTransactionTrace>,
        logs: Vec<RpcLog>,
    },
}

pub struct Worker<I: AnvilProvider> {
    pub(crate) inner: I,
}

impl<I: AnvilProvider + Clone + Send + 'static> Worker<I> {
    pub fn new(inner: I) -> Self {
        Self { inner }
    }

    async fn block_to_sync_info(&self, block: Block) -> Result<SyncInfo> {
        // Try to get fork block number from anvil_nodeInfo
        let fork_block_number = match self.inner.provider().await {
            Ok(provider) => {
                match provider
                    .client()
                    .request::<(), serde_json::Value>("anvil_nodeInfo", ())
                    .await
                {
                    Ok(node_info) => node_info.get("forkBlockNumber").and_then(|v| v.as_u64()),
                    Err(_) => None,
                }
            }
            Err(_) => None,
        };

        Ok(SyncInfo {
            number: block.header.number,
            hash: block.header.hash,
            fork_block_number,
        })
    }

    pub fn network(&self) -> &Network {
        self.inner.network()
    }

    pub async fn wait_until_available(&mut self) -> Result<SyncInfo> {
        self.inner.wait_until_available().await
    }

    pub async fn provider(&self) -> Result<RootProvider<Ethereum>> {
        self.inner.provider().await
    }

    #[instrument(skip_all, fields(network = self.network().name))]
    pub async fn run<C: Consumer + Send + 'static + Clone>(
        mut self,
        mut quit_rx: oneshot::Receiver<()>,
        consumer: C,
    ) {
        // Main restart loop - runs indefinitely, restarting on failures
        loop {
            debug!("starting cycle");

            match self.run_once(&mut quit_rx, consumer.clone()).await {
                Ok(()) => {
                    debug!("quit signal received");
                    return;
                }
                Err(e) => {
                    debug!("failed: {}, restarting in 500ms", e);
                    sleep(Duration::from_millis(500)).await; // Fast restart for local testing
                }
            }
        }
    }

    async fn run_once<C: Consumer + Send + 'static>(
        &mut self,
        quit_rx: &mut oneshot::Receiver<()>,
        consumer: C,
    ) -> Result<()> {
        let (msg_tx, msg_rx) = mpsc::unbounded_channel::<Msg>();
        let _processor_handle = tokio::spawn(async move {
            message_processor(msg_rx, consumer).await;
        });
        debug!("Resetting tracker");
        msg_tx.send(Msg::Reset)?;

        // Phase 1: Initial sync - wait for node to be available
        let sync_info = loop {
            tokio::select! {
                _ = &mut *quit_rx => {
                    return Ok(());
                }
                _ = sleep(Duration::from_secs(1)) => {
                    // Wait for node to be available and get latest block info
                    match self.wait_until_available().await {
                        Ok(block_info) => {
                            debug!("node available at block {}", block_info.number);
                            break block_info;
                        }
                        Err(e) => {
                            debug!("node unavailable: {}", e);
                            continue;
                        }
                    }
                }
            }
        };

        // start live stream immediately to ensure from_block is still valid
        let mut live_stream = self.inner.block_stream().await?;
        let mut historical_stream = self.inner.historical_blocks_stream(&sync_info).await?;

        // Phase 2: Stream historical blocks first
        debug!("streaming historical blocks up to {}", sync_info.number);
        loop {
            tokio::select! {
                _ = &mut *quit_rx => {
                    return Ok(());
                }
                msg_opt = historical_stream.next() => {
                    match msg_opt {
                        Some(msg) => {
                            msg_tx.send(msg)?;
                        }
                        None => {
                            debug!("historical streaming complete");
                            break;
                        }
                    }
                }
            }
        }

        // Phase 3: poll live stream while handling quit signal
        debug!("starting live streaming");
        loop {
            tokio::select! {
                _ = &mut *quit_rx => {
                    return Ok(());
                }
                msg_opt = live_stream.next() => {
                    match msg_opt {
                        Some(msg) => {
                            msg_tx.send(msg)?;
                        }
                        None => {
                            // Live stream ended (shouldn't normally happen), return error to restart
                            debug!("live stream ended, triggering restart");
                            return Err(eyre!("Live stream ended unexpectedly"));
                        }
                    }
                }
            }
        }
    }
}

async fn message_processor<C: Consumer>(mut msg_rx: mpsc::UnboundedReceiver<Msg>, mut consumer: C) {
    while let Some(msg) = msg_rx.recv().await {
        consumer.process(msg).await;
    }
    debug!("message processor stopped");
}

#[derive(Clone)]
pub enum AnvilProviderType {
    Http(crate::tracker2::AnvilHttp),
    Ws(crate::tracker2::AnvilWs),
}

impl AnvilProvider for AnvilProviderType {
    fn network(&self) -> &Network {
        match self {
            AnvilProviderType::Http(provider) => provider.network(),
            AnvilProviderType::Ws(provider) => provider.network(),
        }
    }

    async fn wait_until_available(&mut self) -> Result<SyncInfo> {
        match self {
            AnvilProviderType::Http(provider) => provider.wait_until_available().await,
            AnvilProviderType::Ws(provider) => provider.wait_until_available().await,
        }
    }

    async fn provider(&self) -> Result<RootProvider<Ethereum>> {
        match self {
            AnvilProviderType::Http(provider) => provider.provider().await,
            AnvilProviderType::Ws(provider) => provider.provider().await,
        }
    }

    async fn block_stream(&self) -> Result<Box<dyn Stream<Item = Msg> + Send + Unpin>> {
        match self {
            AnvilProviderType::Http(provider) => provider.block_stream().await,
            AnvilProviderType::Ws(provider) => provider.block_stream().await,
        }
    }

    async fn historical_blocks_stream(
        &self,
        sync_info: &SyncInfo,
    ) -> Result<Box<dyn Stream<Item = Msg> + Send + Unpin>> {
        match self {
            AnvilProviderType::Http(provider) => provider.historical_blocks_stream(sync_info).await,
            AnvilProviderType::Ws(provider) => provider.historical_blocks_stream(sync_info).await,
        }
    }
}

pub fn create_worker(network: Network) -> Worker<AnvilProviderType> {
    let inner = if network.ws_url.is_some() {
        AnvilProviderType::Ws(crate::tracker2::AnvilWs::new(network))
    } else {
        AnvilProviderType::Http(crate::tracker2::AnvilHttp::new(network))
    };
    Worker::new(inner)
}

#[cfg(test)]
mod tests {
    use ethui_types::NetworkStatus;
    use tokio::{
        sync::mpsc,
        time::{sleep, timeout, Duration},
    };

    use super::*;
    use crate::tracker2::{AnvilHttp, AnvilWs};

    #[tokio::test]
    async fn test_worker_networks() {
        let network = Network::anvil(0);
        let http_provider = AnvilHttp::new(network.clone());
        assert_eq!(http_provider.network().name, network.name);

        let ws_provider = AnvilWs::new(network.clone());
        assert_eq!(ws_provider.network().name, network.name);
    }

    #[tokio::test]
    async fn test_worker_from_network() {
        use ethui_types::Network;
        use url::Url;

        // Network with WebSocket URL should create WsWorker
        let network_with_ws = Network {
            dedup_chain_id: (31337, 0).into(),
            name: "Test Network".to_string(),
            explorer_url: None,
            http_url: Url::parse("http://localhost:8545").unwrap(),
            ws_url: Some(Url::parse("ws://localhost:8545").unwrap()),
            currency: "ETH".to_string(),
            decimals: 18,
            status: NetworkStatus::Unknown,
        };

        let worker = super::create_worker(network_with_ws.clone());
        match &worker.inner {
            super::AnvilProviderType::Ws(_) => {} // Expected
            super::AnvilProviderType::Http(_) => {
                panic!("Expected WS provider for network with WebSocket URL")
            }
        }
        assert_eq!(worker.network().name, "Test Network");

        // Network without WebSocket URL should create AnvilHttp
        let network_without_ws = Network {
            dedup_chain_id: (31337, 0).into(),
            name: "Test Network".to_string(),
            explorer_url: None,
            http_url: Url::parse("http://localhost:8545").unwrap(),
            ws_url: None,
            currency: "ETH".to_string(),
            decimals: 18,
            status: NetworkStatus::Unknown,
        };

        let worker = super::create_worker(network_without_ws);
        match &worker.inner {
            super::AnvilProviderType::Http(_) => {} // Expected
            super::AnvilProviderType::Ws(_) => {
                panic!("Expected HTTP provider for network without WebSocket URL")
            }
        }
        assert_eq!(worker.network().name, "Test Network");
    }

    #[tokio::test]
    async fn test_worker_message_queue() {
        let network = Network::anvil(0);
        let worker = Worker::new(AnvilHttp::new(network));

        let (quit_tx, quit_rx) = oneshot::channel();

        let worker_handle = tokio::spawn(async move {
            let consumer = crate::tests::utils::TestConsumer;
            worker.run(quit_rx, consumer).await;
        });

        // Let worker run briefly to send some Reset messages
        sleep(Duration::from_millis(100)).await;

        // Send quit signal
        quit_tx.send(()).unwrap();

        // Wait for worker to finish
        let result = timeout(Duration::from_secs(2), worker_handle).await;
        assert!(result.is_ok(), "Worker should terminate within timeout");
    }

    #[tokio::test]
    async fn test_wait_until_available_not_available() {
        use ethui_types::Network;
        use url::Url;

        // Create a network with an unreachable HTTP URL
        let network = Network {
            dedup_chain_id: (31337, 0).into(),
            name: "Unreachable Network".to_string(),
            explorer_url: None,
            http_url: Url::parse("http://localhost:9999").unwrap(), // Non-existent port
            ws_url: None,
            currency: "ETH".to_string(),
            decimals: 18,
            status: NetworkStatus::Unknown,
        };

        let mut worker = Worker::new(AnvilHttp::new(network));

        // Should fail quickly but we'll use a timeout to make sure test doesn't hang
        let result = timeout(Duration::from_secs(3), worker.wait_until_available()).await;

        match result {
            Ok(Err(_)) => {} // Expected - connection should fail
            Err(_) => {}     // Also acceptable - timeout
            Ok(Ok(_)) => panic!("Should not succeed connecting to unreachable network"),
        }
    }

    #[tokio::test]
    async fn test_block_subscription_http() {
        let network = Network::anvil(0);
        let provider = AnvilHttp::new(network);

        let (block_tx, mut block_rx) = mpsc::unbounded_channel::<Msg>();

        // Start stream polling in background - expect it to fail quickly due to no node
        let subscription_handle = tokio::spawn(async move {
            // Try to create stream and poll for a short time
            if let Ok(mut stream) = provider.block_stream().await {
                let _ = timeout(Duration::from_millis(100), async {
                    while let Some(msg) = stream.next().await {
                        let _ = block_tx.send(msg);
                    }
                })
                .await;
            }
        });

        // Should not receive any messages since there's no real node
        let result = timeout(Duration::from_millis(50), block_rx.recv()).await;
        // Either timeout or receiver is closed, both are acceptable since no real node is running
        match result {
            Err(_) => {}   // Timeout - expected
            Ok(None) => {} // Channel closed - also expected if connection fails immediately
            Ok(Some(_)) => panic!("Should not receive messages with no real node"),
        }

        // Clean up
        subscription_handle.abort();
    }

    #[tokio::test]
    async fn test_block_subscription_ws() {
        let network = Network {
            dedup_chain_id: (31337, 0).into(),
            name: "Test Network".to_string(),
            explorer_url: None,
            http_url: url::Url::parse("http://localhost:8545").unwrap(),
            ws_url: Some(url::Url::parse("ws://localhost:8545").unwrap()),
            currency: "ETH".to_string(),
            decimals: 18,
            status: ethui_types::NetworkStatus::Unknown,
        };

        let provider = AnvilWs::new(network);

        let (block_tx, mut block_rx) = mpsc::unbounded_channel::<Msg>();

        // Start stream polling in background - expect it to fail quickly due to no node
        let subscription_handle = tokio::spawn(async move {
            // Try to create stream and poll for a short time
            if let Ok(mut stream) = provider.block_stream().await {
                let _ = timeout(Duration::from_millis(100), async {
                    while let Some(msg) = stream.next().await {
                        let _ = block_tx.send(msg);
                    }
                })
                .await;
            }
        });

        // Should not receive any messages since there's no real node
        let result = timeout(Duration::from_millis(50), block_rx.recv()).await;
        // Either timeout or receiver is closed, both are acceptable since no real node is running
        match result {
            Err(_) => {}   // Timeout - expected
            Ok(None) => {} // Channel closed - also expected if connection fails immediately
            Ok(Some(_)) => panic!("Should not receive messages with no real node"),
        }

        // Clean up
        subscription_handle.abort();
    }

    #[tokio::test]
    async fn test_worker_subscription_lifecycle() {
        let network = Network::anvil(0);
        let worker = Worker::new(AnvilHttp::new(network));

        let (quit_tx, quit_rx) = oneshot::channel();
        let consumer = crate::tests::utils::TestConsumer;

        // Start worker in background
        let worker_handle = tokio::spawn(async move {
            worker.run(quit_rx, consumer).await;
        });

        // Let worker try to initialize (will fail due to no real node)
        sleep(Duration::from_millis(50)).await;

        // Send quit signal
        quit_tx.send(()).unwrap();

        // Wait for worker to finish with timeout
        let result = timeout(Duration::from_secs(2), worker_handle).await;
        assert!(result.is_ok(), "Worker should terminate within timeout");
    }
}
