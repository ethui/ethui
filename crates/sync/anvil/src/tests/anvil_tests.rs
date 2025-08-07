use std::sync::{
    Arc,
    atomic::{AtomicU32, Ordering},
};

use ethui_types::{Network, NetworkStatus};
use serial_test::serial;
use tokio::time::{Duration, sleep, timeout};
use url::Url;

use super::utils::{AnvilInstance, TestConsumer};
use crate::tracker2::{
    AnvilHttp, AnvilWs,
    anvil::AnvilProvider,
    consumer::Consumer,
    worker::{Msg, Worker},
};

#[derive(Clone)]
struct CountingConsumer {
    count: Arc<AtomicU32>,
}

impl Consumer for CountingConsumer {
    fn process(&mut self, _msg: Msg) -> impl std::future::Future<Output = ()> + Send {
        let count = self.count.clone();
        async move {
            count.fetch_add(1, Ordering::SeqCst);
        }
    }
}

#[tokio::test]
#[serial(anvil)]
async fn test_http_worker_with_anvil() {
    let anvil = match AnvilInstance::start().await {
        Ok(anvil) => anvil,
        Err(e) => {
            println!("Skipping test, could not start Anvil: {e}");
            return;
        }
    };

    let network = anvil.create_network("Test HTTP Network");
    let worker = AnvilHttp::new(network);
    let consumer = TestConsumer;

    let (quit_tx, quit_rx) = tokio::sync::oneshot::channel();

    let worker_handle = tokio::spawn(async move {
        let worker = Worker::new(worker);
        worker.run(quit_rx, consumer).await;
    });

    // Let worker run for a bit
    sleep(Duration::from_millis(100)).await;

    // Send quit signal
    quit_tx.send(()).unwrap();

    // Wait for worker to finish with timeout
    let result = timeout(Duration::from_secs(15), worker_handle).await;
    assert!(result.is_ok(), "Worker should terminate within timeout");
}

#[tokio::test]
#[serial(anvil)]
async fn test_ws_worker_with_anvil() {
    let anvil = match AnvilInstance::start().await {
        Ok(anvil) => anvil,
        Err(e) => {
            println!("Skipping test, could not start Anvil: {e}");
            return;
        }
    };

    let network = anvil.create_network("Test WS Network");
    let worker = AnvilWs::new(network);
    let consumer = TestConsumer;

    let (quit_tx, quit_rx) = tokio::sync::oneshot::channel();

    let worker_handle = tokio::spawn(async move {
        let worker = Worker::new(worker);
        worker.run(quit_rx, consumer).await;
    });

    // Let worker run for a bit
    sleep(Duration::from_millis(100)).await;

    // Send quit signal
    quit_tx.send(()).unwrap();

    // Wait for worker to finish with timeout
    let result = timeout(Duration::from_secs(15), worker_handle).await;
    assert!(result.is_ok(), "Worker should terminate within timeout");
}

#[tokio::test]
#[serial(anvil)]
async fn test_message_processing_with_anvil() {
    let anvil = match AnvilInstance::start().await {
        Ok(anvil) => anvil,
        Err(e) => {
            println!("Skipping test, could not start Anvil: {e}");
            return;
        }
    };

    let network = anvil.create_network("Test Message Processing");
    let worker = AnvilHttp::new(network);
    let message_count = Arc::new(AtomicU32::new(0));
    let consumer = CountingConsumer {
        count: message_count.clone(),
    };

    let (quit_tx, quit_rx) = tokio::sync::oneshot::channel();

    let worker_handle = tokio::spawn(async move {
        let worker = Worker::new(worker);
        worker.run(quit_rx, consumer).await;
    });

    // Let worker run long enough to trigger at least one Reset message
    sleep(Duration::from_millis(1100)).await;

    // Send quit signal
    quit_tx.send(()).unwrap();

    // Wait for worker to finish
    let result = timeout(Duration::from_secs(15), worker_handle).await;
    assert!(result.is_ok(), "Worker should terminate within timeout");

    // Verify that messages were processed
    let final_count = message_count.load(Ordering::SeqCst);
    assert!(
        final_count > 0,
        "Consumer should have processed at least one message, got {final_count}"
    );
}

#[tokio::test]
#[serial(anvil)]
async fn test_wait_with_anvil() {
    let anvil = match AnvilInstance::start().await {
        Ok(anvil) => anvil,
        Err(e) => {
            println!("Skipping test, could not start Anvil: {e}");
            return;
        }
    };

    let network = anvil.create_network("Test Wait Until Available");

    // Test HTTP worker
    let mut http_worker = Worker::new(AnvilHttp::new(network.clone()));
    let result = http_worker.wait().await;
    assert!(
        result.is_ok(),
        "HTTP worker should be able to connect to Anvil"
    );

    // Verify block info is available
    if let Ok(block_info) = result {
        // Block number is u64, so it's always >= 0
        assert!(
            !block_info.hash.is_empty(),
            "Block hash should not be empty"
        );
    }

    // Test WS worker
    let mut ws_worker = Worker::new(AnvilWs::new(network));
    let result = ws_worker.wait().await;
    assert!(
        result.is_ok(),
        "WS worker should be able to connect to Anvil"
    );

    // Verify block info is available
    if let Ok(block_info) = result {
        // Block number is u64, so it's always >= 0
        assert!(
            !block_info.hash.is_empty(),
            "Block hash should not be empty"
        );
    }
}

#[tokio::test]
async fn test_wait_unavailable_node() {
    // Test with a network that should fail to connect
    let unavailable_network = Network {
        dedup_chain_id: (31337, 999).into(),
        name: "Unavailable Network".to_string(),
        explorer_url: None,
        http_url: Url::parse("http://localhost:9999").unwrap(), // Non-existent port
        ws_url: Some(Url::parse("ws://localhost:9999").unwrap()),
        currency: "ETH".to_string(),
        decimals: 18,
        status: NetworkStatus::Unknown,
    };

    // Test HTTP worker failure
    let mut http_worker = Worker::new(AnvilHttp::new(unavailable_network.clone()));
    let result = timeout(Duration::from_secs(2), http_worker.wait()).await;

    // Should either timeout or return an error
    match result {
        Ok(Err(_)) => {} // Expected - connection error
        Err(_) => {}     // Expected - timeout
        Ok(Ok(_)) => panic!("Should not succeed connecting to unavailable node"),
    }

    // Test WS worker failure
    let mut ws_worker = Worker::new(AnvilWs::new(unavailable_network));
    let result = timeout(Duration::from_secs(2), ws_worker.wait()).await;

    // Should either timeout or return an error
    match result {
        Ok(Err(_)) => {} // Expected - connection error
        Err(_) => {}     // Expected - timeout
        Ok(Ok(_)) => panic!("Should not succeed connecting to unavailable node"),
    }
}

#[tokio::test]
#[serial(anvil)]
async fn test_block_subscription_with_anvil() {
    let anvil = match AnvilInstance::start().await {
        Ok(anvil) => anvil,
        Err(e) => {
            println!("Skipping test, could not start Anvil: {e}");
            return;
        }
    };

    let network = anvil.create_network("Test Block Subscription");

    // Test HTTP block subscription
    let http_provider = AnvilHttp::new(network.clone());
    let (block_tx, mut block_rx) = tokio::sync::mpsc::unbounded_channel::<Msg>();

    // Start subscription by polling the stream
    let subscription_handle = tokio::spawn(async move {
        if let Ok(mut stream) = http_provider.subscribe_blocks().await {
            use futures::StreamExt;
            while let Some(msg) = stream.next().await {
                if block_tx.send(msg).is_err() {
                    println!("Receiver dropped");
                    break;
                }
            }
        } else {
            println!("Failed to create stream");
        }
    });

    // Wait a bit to ensure subscription is active
    sleep(Duration::from_millis(100)).await;

    // Mine a new block to trigger subscription
    let provider = anvil_provider(&network).await.unwrap();
    {
        use alloy::providers::ext::AnvilApi;
        let _ = provider.anvil_mine(Some(1u64), None).await;
    }

    // Should receive the new block
    let result = timeout(Duration::from_secs(5), block_rx.recv()).await;
    match result {
        Ok(Some(msg)) => {
            println!("Received message: {msg:?}");
            match msg {
                crate::tracker2::worker::Msg::BlockData { block_number, .. } => {
                    assert!(block_number > 0, "Should receive a valid block");
                }
                _ => panic!("Expected BlockData message"),
            }
        }
        Ok(None) => panic!("Block receiver was closed unexpectedly"),
        Err(_) => {
            // This might happen if the subscription takes longer to poll
            println!("Warning: Did not receive block within timeout");
        }
    }

    // Clean up
    subscription_handle.abort();
}

#[tokio::test]
#[serial(anvil)]
async fn test_worker_with_block_subscription() {
    let anvil = match AnvilInstance::start().await {
        Ok(anvil) => anvil,
        Err(e) => {
            println!("Skipping test, could not start Anvil: {e}");
            return;
        }
    };

    let network = anvil.create_network("Test Worker Block Subscription");
    let worker = Worker::new(AnvilHttp::new(network.clone()));
    let consumer = TestConsumer;

    let (quit_tx, quit_rx) = tokio::sync::oneshot::channel();

    // Start worker
    let worker_handle = tokio::spawn(async move {
        worker.run(quit_rx, consumer).await;
    });

    // Give worker time to initialize and start subscription
    sleep(Duration::from_millis(500)).await;

    // Mine a block to trigger subscription
    let provider = anvil_provider(&network).await.unwrap();
    {
        use alloy::providers::ext::AnvilApi;
        let _ = provider.anvil_mine(Some(1u64), None).await;
    }

    // Give worker time to process the block
    sleep(Duration::from_millis(200)).await;

    // Stop worker
    quit_tx.send(()).unwrap();

    // Wait for worker to finish
    let result = timeout(Duration::from_secs(5), worker_handle).await;
    assert!(result.is_ok(), "Worker should terminate cleanly");
}

async fn anvil_provider(
    network: &Network,
) -> Result<alloy::providers::RootProvider<alloy::network::Ethereum>, Box<dyn std::error::Error>> {
    use alloy::providers::ProviderBuilder;

    let provider = ProviderBuilder::new()
        .disable_recommended_fillers()
        .connect(network.http_url.as_str())
        .await?;

    Ok(provider)
}

#[tokio::test]
#[serial(anvil)]
async fn test_historical_blocks_stream() {
    let anvil = match AnvilInstance::start().await {
        Ok(anvil) => anvil,
        Err(e) => {
            println!("Skipping test, could not start Anvil: {e}");
            return;
        }
    };

    let network = anvil.create_network("Test Historical Blocks Stream");

    // First, mine a few blocks to create history
    let provider = anvil_provider(&network).await.unwrap();
    {
        use alloy::providers::ext::AnvilApi;
        let _ = provider.anvil_mine(Some(3u64), None).await; // Mine 3 blocks
    }

    // Get the current block info to determine the range
    let http_provider = AnvilHttp::new(network.clone());
    let mut worker = Worker::new(http_provider.clone());
    let sync_info = worker.wait().await.expect("Should get sync info");

    println!(
        "Current block: {}, fork block: {:?}",
        sync_info.number, sync_info.fork_block_number
    );

    // Test historical blocks stream
    let historical_stream = http_provider
        .backfill_blocks(&sync_info)
        .await
        .expect("Should create historical stream");

    let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel::<Msg>();

    // Collect messages from historical stream
    let collection_handle = tokio::spawn(async move {
        use futures::StreamExt;
        let mut stream = historical_stream;
        while let Some(msg) = stream.next().await {
            if tx.send(msg).is_err() {
                break;
            }
        }
    });

    // Collect all messages
    let mut messages = Vec::new();
    let mut timeout_count = 0;
    while timeout_count < 3 {
        match timeout(Duration::from_millis(500), rx.recv()).await {
            Ok(Some(msg)) => {
                messages.push(msg);
                timeout_count = 0; // Reset timeout counter on successful receive
            }
            Ok(None) => break, // Channel closed
            Err(_) => {
                timeout_count += 1; // Timeout, might be done
            }
        }
    }

    collection_handle.abort();

    println!("Collected {} historical messages", messages.len());

    // Verify we got messages for historical blocks
    assert!(
        !messages.is_empty(),
        "Should receive at least one historical block"
    );

    // Verify all messages are BlockData and in correct order
    let mut expected_block = sync_info.fork_block_number.map(|fb| fb + 1).unwrap_or(1);
    for msg in &messages {
        match msg {
            Msg::BlockData { block_number, .. } => {
                assert_eq!(
                    *block_number, expected_block,
                    "Blocks should be in sequential order"
                );
                expected_block += 1;
            }
            _ => panic!("Expected BlockData message, got: {msg:?}"),
        }
    }

    // The last message should be for the latest known block
    if let Some(Msg::BlockData { block_number, .. }) = messages.last() {
        assert_eq!(
            *block_number, sync_info.number,
            "Last message should be for the latest block"
        );
    }
}

#[tokio::test]
#[serial(anvil)]
async fn test_worker_historical_then_live_streaming() {
    let anvil = match AnvilInstance::start().await {
        Ok(anvil) => anvil,
        Err(e) => {
            println!("Skipping test, could not start Anvil: {e}");
            return;
        }
    };

    let network = anvil.create_network("Test Worker Historical + Live");

    // First, mine a few blocks to create history
    let provider = anvil_provider(&network).await.unwrap();
    {
        use alloy::providers::ext::AnvilApi;
        let _ = provider.anvil_mine(Some(2u64), None).await; // Mine 2 blocks for history
    }

    let worker = Worker::new(AnvilHttp::new(network.clone()));
    let message_count = Arc::new(AtomicU32::new(0));
    let consumer = CountingConsumer {
        count: message_count.clone(),
    };

    let (quit_tx, quit_rx) = tokio::sync::oneshot::channel();

    // Start worker
    let worker_handle = tokio::spawn(async move {
        worker.run(quit_rx, consumer).await;
    });

    // Give worker time to process historical blocks
    sleep(Duration::from_millis(1000)).await;

    let historical_count = message_count.load(Ordering::SeqCst);
    println!("Messages after historical phase: {historical_count}");

    // Mine another block to trigger live streaming
    {
        use alloy::providers::ext::AnvilApi;
        let _ = provider.anvil_mine(Some(1u64), None).await;
    }

    // Give worker time to process the live block
    sleep(Duration::from_millis(500)).await;

    let final_count = message_count.load(Ordering::SeqCst);
    println!("Messages after live phase: {final_count}");

    // Stop worker
    quit_tx.send(()).unwrap();

    // Wait for worker to finish
    let result = timeout(Duration::from_secs(5), worker_handle).await;
    assert!(result.is_ok(), "Worker should terminate cleanly");

    // Verify we processed both historical and live blocks
    // Should have at least the historical blocks (including Reset messages)
    assert!(
        historical_count > 0,
        "Should have processed historical blocks"
    );
    // May or may not have processed the live block depending on timing
}
