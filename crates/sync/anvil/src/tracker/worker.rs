use alloy::{
    network::Ethereum,
    providers::{Provider as _, RootProvider},
    rpc::types::Header,
};
use ethui_types::{prelude::*, Network};
use futures::{Stream, StreamExt};
use tokio::{
    sync::{mpsc, oneshot},
    time::{sleep, timeout, Duration},
};

use crate::tracker::{
    consumer::Consumer,
    provider::AnvilProvider,
    utils::{random_jitter, try_get_sync_info},
};

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
    Block { hash: B256, number: u64 },
}

impl From<Header> for Msg {
    fn from(header: Header) -> Self {
        Self::Block {
            hash: header.hash,
            number: header.number,
        }
    }
}

pub struct Worker<I: AnvilProvider> {
    pub(crate) inner: I,
}

impl<I: AnvilProvider + Clone + Send + 'static> Worker<I> {
    pub fn new(inner: I) -> Self {
        Self { inner }
    }

    pub(crate) fn network(&self) -> &Network {
        self.inner.network()
    }

    pub(crate) async fn wait(&mut self, quit_rx: &mut oneshot::Receiver<()>) -> Result<SyncInfo> {
        let url = self.network().http_url.to_string();

        // Retry logic with exponential backoff
        let mut retry_count = 0;
        const BASE_DELAY: u64 = 100; // milliseconds

        loop {
            tokio::select! {
                _ = &mut *quit_rx => {
                    return Err(eyre!("Quit signal received during wait"));
                }
                result = timeout(Duration::from_secs(2), try_get_sync_info(&url)) => {
                    match result {
                        Ok(Ok(block_info)) => {
                            debug!("node available at block {}", block_info.number);
                            return Ok(block_info);
                        }
                        Ok(Err(_)) => {
                        }
                        Err(_) => {
                        }
                    }

                    retry_count += 1;

                    // Exponential backoff with random jitter
                    let delay = BASE_DELAY * (2_u64.pow(retry_count.min(6))); // Cap at 64x base delay
                    let jitter = random_jitter(&self.network().name, delay / 4, retry_count); // Up to 25% jitter

                    tokio::select! {
                        _ = &mut *quit_rx => {
                            return Err(eyre!("Quit signal received during wait"));
                        }
                        _ = sleep(Duration::from_millis(delay + jitter)) => {}
                    }
                }
            }
        }
    }

    #[instrument(skip_all, fields(network = self.network().name))]
    pub async fn run(mut self, mut quit_rx: oneshot::Receiver<()>, consumer: impl Consumer) {
        loop {
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

    async fn run_once(
        &mut self,
        quit_rx: &mut oneshot::Receiver<()>,
        consumer: impl Consumer,
    ) -> Result<()> {
        let (msg_tx, msg_rx) = mpsc::unbounded_channel::<Msg>();
        tokio::spawn(async move { consume(msg_rx, consumer).await });

        debug!("Resetting tracker");
        msg_tx.send(Msg::Reset)?;

        // Phase 1: Initial sync - wait for node to be available
        let sync_info = self.wait(quit_rx).await?;

        let provider = self.inner.provider().await?;
        let mut checkpoint: Option<B256> = None;

        // Create merged stream: historical blocks followed seamlessly by live blocks
        let live = self.inner.subscribe_blocks().await?;
        let backfill = self.inner.backfill_blocks(&sync_info).await?;
        // Wrap the chained stream with connection monitoring (monitors internally)
        let mut stream = backfill.chain(live);

        let mut checkpoint_interval = tokio::time::interval(Duration::from_secs(2));

        debug!("starting block stream");
        loop {
            tokio::select! {
                _ = &mut *quit_rx => {
                    return Ok(());
                }
                _ = checkpoint_interval.tick() => {
                    checkpoint = validate_checkpoint(&provider, checkpoint).await?;
                }
                msg_opt = timeout(Duration::from_secs(3), stream.next()) => {
                    match msg_opt {
                        Ok(Some(block_header)) => {
                            checkpoint = validate_and_update_checkpoint(&provider, checkpoint, block_header.hash).await?;
                            msg_tx.send(block_header.into())?;
                        },
                        Ok(None) => {
                            // Stream ended - either historical finished and live stream ended, or connection lost
                            debug!("merged stream ended, triggering restart");
                            return Err(eyre!("Stream ended"));
                        }
                        Err(_) => {
                            // Timeout - continue loop to allow TerminateOnConnectionLoss to be polled
                            continue;
                        }
                    }
                }
            }
        }
    }
}

async fn validate_checkpoint(
    provider: &RootProvider<Ethereum>,
    checkpoint: Option<B256>,
) -> Result<Option<B256>> {
    if let Some(checkpoint) = checkpoint {
        if provider.get_block_by_hash(checkpoint).await?.is_some() {
            Ok(Some(checkpoint))
        } else {
            Err(eyre!("Revert detected, triggering restart"))
        }
    } else {
        Ok(None)
    }
}

async fn validate_and_update_checkpoint(
    provider: &RootProvider<Ethereum>,
    checkpoint: Option<B256>,
    new_checkpoint: B256,
) -> Result<Option<B256>> {
    validate_checkpoint(provider, checkpoint).await?;
    Ok(Some(new_checkpoint))
}

async fn consume(mut msg_rx: mpsc::UnboundedReceiver<Msg>, mut consumer: impl Consumer) {
    while let Some(msg) = msg_rx.recv().await {
        if let Err(e) = consumer.process(msg).await {
            error!("Error processing message: {:?}", e);
        }
    }
}

#[derive(Clone)]
pub enum AnvilProviderType {
    Http(crate::tracker::AnvilHttp),
    Ws(crate::tracker::AnvilWs),
}

impl AnvilProvider for AnvilProviderType {
    fn network(&self) -> &Network {
        match self {
            AnvilProviderType::Http(provider) => provider.network(),
            AnvilProviderType::Ws(provider) => provider.network(),
        }
    }

    async fn provider(&self) -> Result<RootProvider<Ethereum>> {
        match self {
            AnvilProviderType::Http(provider) => provider.provider().await,
            AnvilProviderType::Ws(provider) => provider.provider().await,
        }
    }

    async fn subscribe_blocks(&self) -> Result<Box<dyn Stream<Item = Header> + Send + Unpin>> {
        match self {
            AnvilProviderType::Http(provider) => provider.subscribe_blocks().await,
            AnvilProviderType::Ws(provider) => provider.subscribe_blocks().await,
        }
    }

    async fn backfill_blocks(
        &self,
        sync_info: &SyncInfo,
    ) -> Result<Box<dyn Stream<Item = Header> + Send + Unpin>> {
        match self {
            AnvilProviderType::Http(provider) => provider.backfill_blocks(sync_info).await,
            AnvilProviderType::Ws(provider) => provider.backfill_blocks(sync_info).await,
        }
    }
}

pub fn create_worker(network: Network) -> Worker<AnvilProviderType> {
    let inner = if network.ws_url.is_some() {
        AnvilProviderType::Ws(crate::tracker::AnvilWs::new(network))
    } else {
        AnvilProviderType::Http(crate::tracker::AnvilHttp::new(network))
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
    use crate::tracker::{http::AnvilHttp, ws::AnvilWs};

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
    async fn test_wait_not_available() {
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
        let (_quit_tx, mut quit_rx) = oneshot::channel();
        let result = timeout(Duration::from_secs(3), worker.wait(&mut quit_rx)).await;

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
            if let Ok(mut stream) = provider.subscribe_blocks().await {
                let _ = timeout(Duration::from_millis(100), async {
                    while let Some(header) = stream.next().await {
                        let _ = block_tx.send(header.into());
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
            if let Ok(mut stream) = provider.subscribe_blocks().await {
                let _ = timeout(Duration::from_millis(100), async {
                    while let Some(header) = stream.next().await {
                        let _ = block_tx.send(header.into());
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
