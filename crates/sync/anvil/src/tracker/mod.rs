use std::{collections::HashMap, sync::Arc};

use ethui_types::{DedupChainId, Network};
use once_cell::sync::Lazy;
use tokio::{
    sync::{oneshot, Mutex},
    task::JoinHandle,
};
use tracing::{debug, info, instrument};

pub mod consumer;
pub mod http;
pub mod provider;
// pub mod monitor;
mod utils;
pub mod worker;
pub mod ws;

#[cfg(not(test))]
use consumer::EthuiConsumer;
pub use http::AnvilHttp;
pub use worker::create_worker;
pub use ws::AnvilWs;

type Workers = Arc<Mutex<HashMap<DedupChainId, (oneshot::Sender<()>, JoinHandle<()>)>>>;

static WORKERS: Lazy<Workers> = Lazy::new(Default::default);

#[instrument(skip_all, fields(network = network.name))]
pub(crate) async fn watch(network: &Network) {
    let mut workers = WORKERS.lock().await;

    if workers.contains_key(&network.dedup_chain_id) {
        debug!("Network {} already being watched", network.name);
        return;
    }

    let (quit_tx, quit_rx) = oneshot::channel();

    #[cfg(test)]
    let consumer = crate::tests::utils::TestConsumer;
    #[cfg(not(test))]
    let consumer: EthuiConsumer = network.clone().into();
    let worker = create_worker(network.clone());

    let handle = tokio::spawn(async move {
        worker.run(quit_rx, consumer).await;
    });

    workers.insert(network.dedup_chain_id, (quit_tx, handle));
    info!("Started watching network {}", network.name);
}

#[instrument(skip_all, fields(network = network.name))]
pub(crate) async fn unwatch(network: &Network) {
    let mut workers = WORKERS.lock().await;

    if let Some((quit_tx, handle)) = workers.remove(&network.dedup_chain_id) {
        let _ = quit_tx.send(());
        handle.abort();
        info!("Stopped watching network {}", network.name);
    } else {
        debug!("Network {} was not being watched", network.name);
    }
}

#[cfg(test)]
mod tests {
    use ethui_types::{Network, NetworkStatus};
    use tokio::time::{sleep, Duration};
    use url::Url;

    use super::*;

    fn create_test_network(dedup_id: i32) -> Network {
        Network {
            dedup_chain_id: (31337, dedup_id).into(),
            name: "Test Network".to_string(),
            explorer_url: None,
            http_url: Url::parse("http://localhost:8545").unwrap(),
            ws_url: Some(Url::parse("ws://localhost:8545").unwrap()),
            currency: "ETH".to_string(),
            decimals: 18,
            status: NetworkStatus::Unknown,
        }
    }

    #[tokio::test]
    async fn test_watch_starts_worker() {
        let network = create_test_network(1);

        // Clean up any existing state
        unwatch(&network).await;

        // Ensure no workers initially
        {
            let workers = WORKERS.lock().await;
            assert!(!workers.contains_key(&network.dedup_chain_id));
        }

        // Start watching
        watch(&network).await;

        // Verify worker is started
        {
            let workers = WORKERS.lock().await;
            assert!(workers.contains_key(&network.dedup_chain_id));
        }

        // Clean up
        unwatch(&network).await;
    }

    #[tokio::test]
    async fn test_watch_duplicate_network_ignored() {
        let network = create_test_network(2);

        // Clean up any existing state
        unwatch(&network).await;

        // Start watching twice
        watch(&network).await;
        watch(&network).await;

        // Should only have one worker for this network
        {
            let workers = WORKERS.lock().await;
            assert!(workers.contains_key(&network.dedup_chain_id));
        }

        // Clean up
        unwatch(&network).await;
    }

    #[tokio::test]
    async fn test_unwatch_stops_worker() {
        let network = create_test_network(3);

        // Clean up any existing state
        unwatch(&network).await;

        // Start watching
        watch(&network).await;

        // Verify worker exists
        {
            let workers = WORKERS.lock().await;
            assert!(workers.contains_key(&network.dedup_chain_id));
        }

        // Stop watching
        unwatch(&network).await;

        // Verify worker is removed
        {
            let workers = WORKERS.lock().await;
            assert!(!workers.contains_key(&network.dedup_chain_id));
        }
    }

    #[tokio::test]
    async fn test_unwatch_nonexistent_network() {
        let network = create_test_network(4);

        // Try to unwatch a network that was never watched
        // Should not panic or error
        unwatch(&network).await;
    }

    #[tokio::test]
    async fn test_multiple_networks() {
        let network1 = create_test_network(5);
        let network2 = create_test_network(6);

        // Clean up any existing state
        unwatch(&network1).await;
        unwatch(&network2).await;

        // Watch both networks
        watch(&network1).await;
        watch(&network2).await;

        // Verify both workers exist
        {
            let workers = WORKERS.lock().await;
            assert!(workers.contains_key(&network1.dedup_chain_id));
            assert!(workers.contains_key(&network2.dedup_chain_id));
        }

        // Stop watching first network
        unwatch(&network1).await;

        // Verify only second worker remains
        {
            let workers = WORKERS.lock().await;
            assert!(!workers.contains_key(&network1.dedup_chain_id));
            assert!(workers.contains_key(&network2.dedup_chain_id));
        }

        // Clean up
        unwatch(&network2).await;
    }

    #[tokio::test]
    async fn test_worker_responds_to_quit_signal() {
        let network = create_test_network(7);

        // Clean up any existing state
        unwatch(&network).await;

        // Start watching
        watch(&network).await;

        // Give worker a moment to start
        sleep(Duration::from_millis(10)).await;

        // Stop watching
        unwatch(&network).await;

        // Give worker a moment to stop
        sleep(Duration::from_millis(10)).await;

        // Worker should be cleaned up
        {
            let workers = WORKERS.lock().await;
            assert!(!workers.contains_key(&network.dedup_chain_id));
        }
    }

    #[tokio::test]
    async fn test_worker_types() {
        use crate::tracker::{http::AnvilHttp, provider::AnvilProvider, ws::AnvilWs};

        let network = create_test_network(8);

        // Test AnvilHttp
        let http_provider = AnvilHttp::new(network.clone());
        assert_eq!(http_provider.network().name, network.name);

        // Test AnvilWs
        let ws_provider = AnvilWs::new(network.clone());
        assert_eq!(ws_provider.network().name, network.name);
    }

    #[tokio::test]
    async fn test_automatic_worker_selection() {
        use url::Url;

        use crate::tracker::worker::{create_worker, AnvilProviderType};

        // Network with WebSocket should use WsWorker
        let ws_network = Network {
            dedup_chain_id: (31337, 1).into(),
            name: "WS Network".to_string(),
            explorer_url: None,
            http_url: Url::parse("http://localhost:8545").unwrap(),
            ws_url: Some(Url::parse("ws://localhost:8545").unwrap()),
            currency: "ETH".to_string(),
            decimals: 18,
            status: NetworkStatus::Unknown,
        };

        let worker = create_worker(ws_network.clone());
        match &worker.inner {
            AnvilProviderType::Ws(_) => {} // Expected
            AnvilProviderType::Http(_) => {
                panic!("Expected WS provider for network with WebSocket URL")
            }
        }
        assert_eq!(worker.network().name, "WS Network");

        // Network without WebSocket should use AnvilHttp
        let http_network = Network {
            dedup_chain_id: (31337, 2).into(),
            name: "HTTP Network".to_string(),
            explorer_url: None,
            http_url: Url::parse("http://localhost:8545").unwrap(),
            ws_url: None,
            currency: "ETH".to_string(),
            decimals: 18,
            status: NetworkStatus::Unknown,
        };

        let worker = create_worker(http_network.clone());
        match &worker.inner {
            AnvilProviderType::Http(_) => {} // Expected
            AnvilProviderType::Ws(_) => {
                panic!("Expected HTTP provider for network without WebSocket URL")
            }
        }
        assert_eq!(worker.network().name, "HTTP Network");
    }
}
