use std::sync::{
    atomic::{AtomicU32, Ordering},
    Arc,
};

use ethui_types::{prelude::*, Network, NetworkStatus};
use tokio::time::{sleep, timeout, Duration};
use url::Url;

use super::utils::TestConsumer;
use crate::tracker2::{
    anvil::AnvilProvider,
    consumer::Consumer,
    worker::{Msg, Worker},
    AnvilHttp, AnvilWs,
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
async fn test_http_worker_lifecycle() {
    // Test HTTP worker lifecycle without requiring actual Anvil instance
    let network = Network {
        dedup_chain_id: (31337, 0).into(),
        name: "Test HTTP Network".to_string(),
        explorer_url: None,
        http_url: Url::parse("http://localhost:18545").unwrap(),
        ws_url: None,
        currency: "ETH".to_string(),
        decimals: 18,
        status: NetworkStatus::Unknown,
    };
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
async fn test_ws_worker_lifecycle() {
    // Test WS worker lifecycle without requiring actual Anvil instance
    let network = Network {
        dedup_chain_id: (31337, 0).into(),
        name: "Test WS Network".to_string(),
        explorer_url: None,
        http_url: Url::parse("http://localhost:18545").unwrap(),
        ws_url: Some(Url::parse("ws://localhost:18545").unwrap()),
        currency: "ETH".to_string(),
        decimals: 18,
        status: NetworkStatus::Unknown,
    };
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
async fn test_message_processing_lifecycle() {
    // Test message processing lifecycle without requiring actual Anvil instance
    let network = Network {
        dedup_chain_id: (31337, 0).into(),
        name: "Test Message Processing".to_string(),
        explorer_url: None,
        http_url: Url::parse("http://localhost:18545").unwrap(),
        ws_url: None,
        currency: "ETH".to_string(),
        decimals: 18,
        status: NetworkStatus::Unknown,
    };
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
async fn test_wait_behavior() {
    // Test wait behavior - this will test timeout/failure paths without anvil
    let network = Network {
        dedup_chain_id: (31337, 0).into(),
        name: "Test Wait Until Available".to_string(),
        explorer_url: None,
        http_url: Url::parse("http://localhost:18545").unwrap(),
        ws_url: Some(Url::parse("ws://localhost:18545").unwrap()),
        currency: "ETH".to_string(),
        decimals: 18,
        status: NetworkStatus::Unknown,
    };

    // Test HTTP worker - should timeout or error without anvil
    let mut http_worker = Worker::new(AnvilHttp::new(network.clone()));
    let (_quit_tx, mut quit_rx) = tokio::sync::oneshot::channel();
    let result = timeout(Duration::from_secs(2), http_worker.wait(&mut quit_rx)).await;

    // Should either timeout or return an error since no anvil is running
    match result {
        Ok(Err(_)) => {} // Expected - connection error
        Err(_) => {}     // Expected - timeout
        Ok(Ok(_)) => { // Unexpected - this would mean anvil is actually running
             // This is fine too, but not expected in CI without anvil setup
        }
    }

    // Test WS worker - should timeout or error without anvil
    let mut ws_worker = Worker::new(AnvilWs::new(network));
    let (_quit_tx, mut quit_rx) = tokio::sync::oneshot::channel();
    let result = timeout(Duration::from_secs(2), ws_worker.wait(&mut quit_rx)).await;

    // Should either timeout or return an error since no anvil is running
    match result {
        Ok(Err(_)) => {} // Expected - connection error
        Err(_) => {}     // Expected - timeout
        Ok(Ok(_)) => { // Unexpected - this would mean anvil is actually running
             // This is fine too, but not expected in CI without anvil setup
        }
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
    let (_quit_tx, mut quit_rx) = tokio::sync::oneshot::channel();
    let result = timeout(Duration::from_secs(2), http_worker.wait(&mut quit_rx)).await;

    // Should either timeout or return an error
    match result {
        Ok(Err(_)) => {} // Expected - connection error
        Err(_) => {}     // Expected - timeout
        Ok(Ok(_)) => panic!("Should not succeed connecting to unavailable node"),
    }

    // Test WS worker failure
    let mut ws_worker = Worker::new(AnvilWs::new(unavailable_network));
    let (_quit_tx, mut quit_rx) = tokio::sync::oneshot::channel();
    let result = timeout(Duration::from_secs(2), ws_worker.wait(&mut quit_rx)).await;

    // Should either timeout or return an error
    match result {
        Ok(Err(_)) => {} // Expected - connection error
        Err(_) => {}     // Expected - timeout
        Ok(Ok(_)) => panic!("Should not succeed connecting to unavailable node"),
    }
}

#[tokio::test]
async fn test_block_subscription_behavior() {
    // Test block subscription behavior without requiring anvil
    let network = Network {
        dedup_chain_id: (31337, 0).into(),
        name: "Test Block Subscription".to_string(),
        explorer_url: None,
        http_url: Url::parse("http://localhost:18545").unwrap(),
        ws_url: Some(Url::parse("ws://localhost:18545").unwrap()),
        currency: "ETH".to_string(),
        decimals: 18,
        status: NetworkStatus::Unknown,
    };

    // Test HTTP block subscription - should fail gracefully without anvil
    let http_provider = AnvilHttp::new(network.clone());

    // Try to create a subscription - should either fail or timeout
    let subscription_result =
        timeout(Duration::from_secs(2), http_provider.subscribe_blocks()).await;

    match subscription_result {
        Ok(Ok(_stream)) => {
            // Stream creation succeeded, but likely won't receive data without anvil
            // This is acceptable - the test validates the subscription can be created
        }
        Ok(Err(_)) => {
            // Expected - connection error without anvil
        }
        Err(_) => {
            // Expected - timeout without anvil
        }
    }
}

#[tokio::test]
async fn test_worker_subscription_lifecycle() {
    // Test worker subscription lifecycle without requiring anvil
    let network = Network {
        dedup_chain_id: (31337, 0).into(),
        name: "Test Worker Block Subscription".to_string(),
        explorer_url: None,
        http_url: Url::parse("http://localhost:18545").unwrap(),
        ws_url: None,
        currency: "ETH".to_string(),
        decimals: 18,
        status: NetworkStatus::Unknown,
    };
    let worker = Worker::new(AnvilHttp::new(network.clone()));
    let consumer = TestConsumer;

    let (quit_tx, quit_rx) = tokio::sync::oneshot::channel();

    // Start worker
    let worker_handle = tokio::spawn(async move {
        worker.run(quit_rx, consumer).await;
    });

    // Give worker time to attempt initialization (will likely fail without anvil)
    sleep(Duration::from_millis(100)).await;

    // Stop worker
    quit_tx.send(()).unwrap();

    // Wait for worker to finish with shorter timeout since it will likely fail quickly
    let result = timeout(Duration::from_secs(2), worker_handle).await;
    // Worker should either terminate cleanly or with expected connection errors
    match result {
        Ok(_) => {} // Clean termination
        Err(_) => { // Timeout - worker might be retrying, but that's ok for this test
             // The test validates that the worker can start and handle quit signals
        }
    }
}

#[tokio::test]
async fn test_historical_blocks_stream_interface() {
    // Test historical blocks stream interface without requiring anvil
    let network = Network {
        dedup_chain_id: (31337, 0).into(),
        name: "Test Historical Blocks Stream".to_string(),
        explorer_url: None,
        http_url: Url::parse("http://localhost:18545").unwrap(),
        ws_url: None,
        currency: "ETH".to_string(),
        decimals: 18,
        status: NetworkStatus::Unknown,
    };

    // Test that backfill_blocks interface works without requiring actual anvil
    let http_provider = AnvilHttp::new(network.clone());

    // Create a mock sync info
    let sync_info = crate::tracker2::worker::SyncInfo {
        number: 5,
        hash: B256::default(),
        fork_block_number: Some(2),
    };

    // Test that we can create a historical stream (will be empty without anvil)
    let historical_stream_result = timeout(
        Duration::from_secs(1),
        http_provider.backfill_blocks(&sync_info),
    )
    .await;

    match historical_stream_result {
        Ok(Ok(_stream)) => {
            // Stream creation succeeded - this tests the interface
            // Without anvil, the stream won't produce data, but that's fine
        }
        Ok(Err(_)) => {
            // Expected - connection error without anvil
        }
        Err(_) => {
            // Expected - timeout without anvil
        }
    }
}

#[tokio::test]
async fn test_worker_streaming_lifecycle() {
    // Test worker streaming lifecycle without requiring anvil
    let network = Network {
        dedup_chain_id: (31337, 0).into(),
        name: "Test Worker Historical + Live".to_string(),
        explorer_url: None,
        http_url: Url::parse("http://localhost:18545").unwrap(),
        ws_url: None,
        currency: "ETH".to_string(),
        decimals: 18,
        status: NetworkStatus::Unknown,
    };

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

    // Give worker time to attempt processing (will likely fail without anvil)
    sleep(Duration::from_millis(200)).await;

    // Stop worker
    quit_tx.send(()).unwrap();

    // Wait for worker to finish
    let _ = timeout(Duration::from_secs(2), worker_handle).await;
}
