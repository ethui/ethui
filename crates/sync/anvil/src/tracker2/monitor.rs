use std::{
    pin::Pin,
    sync::{
        Arc,
        atomic::{AtomicBool, Ordering},
    },
    task::{Context, Poll},
};

use ethui_types::{Network, prelude::*};
use futures::Stream;
use serde_json;
use tokio::time::{Duration, interval};
use tracing::debug;
use url::Url;

/// Stream wrapper that terminates when connection is lost
pub struct TerminateOnConnectionLoss<S> {
    inner: Pin<Box<S>>,
    state: Arc<AtomicBool>,
}

impl<S> TerminateOnConnectionLoss<S> {
    /// Create a new stream wrapper that monitors connection health and terminates when lost
    pub fn new(inner: S, network: Network) -> Self {
        let state = Arc::new(AtomicBool::new(false));

        // Spawn background monitor task
        tokio::spawn({
            let state = state.clone();
            async move { monitor(network.http_url, state).await }
        });

        Self {
            inner: Box::pin(inner),
            state,
        }
    }
}

impl<S> Stream for TerminateOnConnectionLoss<S>
where
    S: Stream,
{
    type Item = S::Item;

    fn poll_next(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        if self.state.load(Ordering::Relaxed) {
            debug!("connection lost - terminating stream");
            return Poll::Ready(None);
        }

        self.inner.as_mut().poll_next(cx)
    }
}

/// Monitor connection health using HTTP keep-alive - works for both HTTP and WebSocket URLs
#[tracing::instrument(level = "trace", skip_all)]
async fn monitor(url: Url, state: Arc<AtomicBool>) {
    debug!("starting keep-alive monitor for {}", url);

    let inner = async || -> Result<()> {
        // Create a raw HTTP client with keep-alive enabled (fast timeouts for local testing)
        let client = reqwest::Client::builder()
            .tcp_keepalive(Some(Duration::from_secs(1)))
            .pool_idle_timeout(Some(Duration::from_secs(2)))
            .pool_max_idle_per_host(1)
            .timeout(Duration::from_secs(2))
            .build()?;

        // JSON-RPC request for keep-alive checks
        let body = serde_json::json!({
            "jsonrpc": "2.0",
            "method": "net_version",
            "params": [],
            "id": 1
        });

        // Helper function to send keep-alive request
        let send_request = || async {
            client
                .post(url.clone())
                .header("Content-Type", "application/json")
                .header("Connection", "keep-alive")
                .json(&body)
                .send()
                .await
        };

        // Send requests at regular intervals, starting immediately
        let mut interval = interval(Duration::from_secs(5));

        loop {
            interval.tick().await;

            if let Ok(response) = send_request().await
                && response.status().is_success()
            {
                // Connection is alive, continue monitoring
                continue;
            } else {
                return Ok(());
            }
        }
    };

    let _ = inner().await;
    debug!("HTTP keep-alive connection monitor stopped");
    state.store(true, Ordering::Relaxed);
}
