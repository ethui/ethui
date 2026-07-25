use std::{
    collections::HashMap,
    sync::{
        Arc, Mutex,
        atomic::{AtomicBool, AtomicU64, Ordering},
    },
    time::Duration,
};

use async_trait::async_trait;
use futures::{SinkExt as _, StreamExt as _};
use serde_json::{Value, json};
use tokio::sync::{Mutex as AsyncMutex, mpsc, oneshot};
use tokio_tungstenite::{connect_async, tungstenite::Message};
use tracing::debug;

use crate::{
    backend::Backend,
    error::{Error, Result},
};

/// Long enough for a human to read and act on an ethui approval dialog.
pub const DEFAULT_TIMEOUT: Duration = Duration::from_secs(120);

type Pending = Arc<Mutex<HashMap<u64, oneshot::Sender<Result<Value>>>>>;

/// One live WebSocket, with the requests waiting on it.
///
/// The pending map belongs to the connection rather than to the backend, so a
/// reconnect cannot disturb requests issued on the new socket: each socket only
/// ever fails the requests it owns.
struct Connection {
    outbound: mpsc::UnboundedSender<Message>,
    pending: Pending,
    alive: Arc<AtomicBool>,
}

impl Connection {
    fn is_alive(&self) -> bool {
        self.alive.load(Ordering::SeqCst)
    }
}

/// Fail every request still waiting on a socket that has gone away.
fn fail_all(pending: &Pending) {
    let drained: Vec<_> = pending.lock().unwrap().drain().collect();
    for (_, sender) in drained {
        let _ = sender.send(Err(Error::Disconnected));
    }
}

/// Route one inbound frame to the request that is waiting for it.
///
/// Frames that are not JSON, or that carry no numeric `id` (ethui's event
/// notifications), are ignored.
fn dispatch(text: &str, pending: &Pending) {
    let Ok(message) = serde_json::from_str::<Value>(text) else {
        return;
    };
    let Some(id) = message.get("id").and_then(Value::as_u64) else {
        return;
    };
    let Some(sender) = pending.lock().unwrap().remove(&id) else {
        return;
    };

    let outcome = match message.get("error") {
        Some(error) => Err(Error::Rpc {
            code: error.get("code").and_then(Value::as_i64).unwrap_or(0),
            message: error
                .get("message")
                .and_then(Value::as_str)
                .unwrap_or("unknown error")
                .to_owned(),
        }),
        None => Ok(message.get("result").cloned().unwrap_or(Value::Null)),
    };

    let _ = sender.send(outcome);
}

/// Removes its pending-map entry when dropped.
///
/// Registration and cleanup are joined so a request can never register
/// without a matching deregistration: normal completion, a send failure, an
/// internal timeout, and the caller cancelling the request (dropping the
/// `request()` future before it resolves — an outer `select!`, an outer
/// timeout, or a task abort) all go through this one `Drop` impl. Removing an
/// id that `dispatch` or `fail_all` already took is a harmless no-op:
/// `HashMap::remove` on an absent key just returns `None`.
struct PendingGuard {
    pending: Pending,
    id: u64,
}

impl PendingGuard {
    fn register(pending: &Pending, id: u64, sender: oneshot::Sender<Result<Value>>) -> Self {
        pending.lock().unwrap().insert(id, sender);
        Self {
            pending: pending.clone(),
            id,
        }
    }
}

impl Drop for PendingGuard {
    fn drop(&mut self) {
        self.pending.lock().unwrap().remove(&self.id);
    }
}

/// Reaches ethui over its WebSocket JSON-RPC port — the same one the browser
/// extension uses.
pub struct WsBackend {
    url: String,
    timeout: Duration,
    next_id: AtomicU64,
    connection: AsyncMutex<Option<Arc<Connection>>>,
}

impl WsBackend {
    /// Connect to a local ethui on `port`, identifying as `mcp://claude` so the
    /// origin shows up in approval dialogs.
    pub fn new(port: u16) -> Self {
        Self::with_url(format!(
            "ws://127.0.0.1:{port}?url=mcp%3A%2F%2Fclaude&origin=claude-mcp"
        ))
    }

    pub fn with_url(url: impl Into<String>) -> Self {
        Self {
            url: url.into(),
            timeout: DEFAULT_TIMEOUT,
            next_id: AtomicU64::new(1),
            connection: AsyncMutex::new(None),
        }
    }

    pub fn with_timeout(mut self, timeout: Duration) -> Self {
        self.timeout = timeout;
        self
    }

    pub fn url(&self) -> &str {
        &self.url
    }

    /// Return the live connection, opening one if there is none.
    async fn connection(&self) -> Result<Arc<Connection>> {
        let mut guard = self.connection.lock().await;

        if let Some(connection) = guard.as_ref()
            && connection.is_alive()
        {
            return Ok(connection.clone());
        }

        let connection = Arc::new(self.connect().await?);
        *guard = Some(connection.clone());

        Ok(connection)
    }

    async fn connect(&self) -> Result<Connection> {
        let (stream, _) = connect_async(&self.url).await.map_err(|e| {
            debug!("connect to {} failed: {e}", self.url);
            Error::Disconnected
        })?;

        let (mut sink, mut source) = stream.split();
        let (outbound, mut to_send) = mpsc::unbounded_channel::<Message>();
        let pending: Pending = Default::default();
        let alive = Arc::new(AtomicBool::new(true));

        // Runs until `to_send` closes (every `outbound` sender dropped) or the
        // socket errors. The handle is intentionally discarded: the task
        // manages its own lifetime and needs no external supervision.
        tokio::spawn(async move {
            while let Some(message) = to_send.recv().await {
                if sink.send(message).await.is_err() {
                    break;
                }
            }
        });

        let reader_pending = pending.clone();
        let reader_outbound = outbound.clone();
        let reader_alive = alive.clone();

        // Runs until the socket closes. The handle is intentionally
        // discarded: the task manages its own lifetime, tearing the
        // connection down (marking it dead and failing `pending`) when it
        // exits.
        tokio::spawn(async move {
            while let Some(Ok(message)) = source.next().await {
                let Message::Text(text) = message else {
                    continue;
                };

                // Application-level keepalive, not a WebSocket control frame.
                if text.as_str() == "pong" || text.as_str() == "ping" {
                    if text.as_str() == "ping" {
                        let _ = reader_outbound.send(Message::Text("pong".into()));
                    }
                    continue;
                }

                dispatch(text.as_str(), &reader_pending);
            }

            reader_alive.store(false, Ordering::SeqCst);
            fail_all(&reader_pending);
        });

        Ok(Connection {
            outbound,
            pending,
            alive,
        })
    }

    /// Issue one JSON-RPC request over `connection` and wait for its matching
    /// response.
    ///
    /// Split out from [`Backend::request`] so a test can supply an
    /// already-obtained connection and manipulate its liveness directly,
    /// exercising the `is_alive` recheck below against the exact code path
    /// production uses — that race (a concurrent `close()` marking this same
    /// connection dead between the caller obtaining it and us inserting into
    /// `pending`) has no reproducible timing of its own to drive a test with.
    async fn send_request(
        &self,
        connection: &Connection,
        method: &str,
        params: Value,
    ) -> Result<Value> {
        let id = self.next_id.fetch_add(1, Ordering::Relaxed);
        let (sender, receiver) = oneshot::channel();

        let _guard = PendingGuard::register(&connection.pending, id, sender);

        // close() can run concurrently between our caller obtaining this
        // connection and our insert just above: it can mark the connection
        // dead and drain its pending map before our entry was ever in it.
        // Catch that here rather than waiting out the full timeout for an
        // answer that will never come.
        if !connection.is_alive() {
            return Err(Error::Disconnected);
        }

        let payload = json!({
            "jsonrpc": "2.0",
            "id": id,
            "method": method,
            "params": params,
        });

        if connection
            .outbound
            .send(Message::Text(payload.to_string().into()))
            .is_err()
        {
            return Err(Error::Disconnected);
        }

        match tokio::time::timeout(self.timeout, receiver).await {
            Ok(Ok(outcome)) => outcome,
            // The connection dropped the sender without answering.
            Ok(Err(_)) => Err(Error::Disconnected),
            Err(_) => Err(Error::Timeout),
        }
    }

    /// Drop the connection and fail everything waiting on it.
    pub async fn close(&self) {
        let taken = self.connection.lock().await.take();

        if let Some(connection) = taken {
            connection.alive.store(false, Ordering::SeqCst);
            let _ = connection.outbound.send(Message::Close(None));
            fail_all(&connection.pending);
        }
    }
}

#[async_trait]
impl Backend for WsBackend {
    async fn request(&self, method: &str, params: Value) -> Result<Value> {
        let connection = self.connection().await?;
        self.send_request(&connection, method, params).await
    }
}

#[cfg(test)]
mod tests {
    use std::time::Duration;

    use serde_json::json;
    use tokio_tungstenite::tungstenite::Message;

    use super::*;
    use crate::testing::{Reply, spawn_echo_server, success_for};

    fn backend_on(port: u16) -> WsBackend {
        WsBackend::with_url(format!("ws://127.0.0.1:{port}"))
            .with_timeout(Duration::from_secs(5))
    }

    #[tokio::test]
    async fn returns_the_result_field() {
        let port = spawn_echo_server(|request, _| {
            Reply::Send(success_for(request, json!("0x7a69")))
        });

        let backend = backend_on(port);
        let result = backend.request("eth_chainId", json!([])).await.unwrap();

        assert_eq!(result, json!("0x7a69"));
    }

    #[tokio::test]
    async fn sends_a_well_formed_jsonrpc_request() {
        let port = spawn_echo_server(|request, _| {
            // Echo the request itself back as the result, so the test can
            // inspect exactly what went over the wire.
            Reply::Send(success_for(request, request.clone()))
        });

        let backend = backend_on(port);
        let sent = backend
            .request("eth_getBalance", json!(["0xabc", "latest"]))
            .await
            .unwrap();

        assert_eq!(sent["jsonrpc"], json!("2.0"));
        assert_eq!(sent["method"], json!("eth_getBalance"));
        assert_eq!(sent["params"], json!(["0xabc", "latest"]));
        assert!(sent["id"].is_u64());
    }

    #[tokio::test]
    async fn correlates_concurrent_requests_by_id() {
        // Answer every request with its own method name, so a mismatched
        // correlation produces a visibly wrong answer rather than a hang.
        let port = spawn_echo_server(|request, _| {
            Reply::Send(success_for(request, request["method"].clone()))
        });

        let backend = backend_on(port);
        let (first, second, third) = tokio::join!(
            backend.request("method_a", json!([])),
            backend.request("method_b", json!([])),
            backend.request("method_c", json!([])),
        );

        assert_eq!(first.unwrap(), json!("method_a"));
        assert_eq!(second.unwrap(), json!("method_b"));
        assert_eq!(third.unwrap(), json!("method_c"));
    }

    #[tokio::test]
    async fn maps_a_jsonrpc_error_to_an_rpc_error() {
        let port = spawn_echo_server(|request, _| {
            Reply::Send(json!({
                "jsonrpc": "2.0",
                "id": request["id"],
                "error": { "code": -32603, "message": "user rejected the request" },
            }))
        });

        let backend = backend_on(port);
        let err = backend.request("eth_sendTransaction", json!([])).await.unwrap_err();

        assert_eq!(
            err.to_string(),
            "RPC error -32603: user rejected the request"
        );
    }

    #[tokio::test]
    async fn answers_the_application_level_ping_with_pong() {
        // ethui-ws sends a literal "ping" text frame every 15s and expects a
        // "pong" text frame back. This is not a WebSocket control frame.
        let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
        listener.set_nonblocking(true).unwrap();
        let port = listener.local_addr().unwrap().port();

        let pong = tokio::spawn(async move {
            let listener = tokio::net::TcpListener::from_std(listener).unwrap();
            let (stream, _) = listener.accept().await.unwrap();
            let ws = tokio_tungstenite::accept_async(stream).await.unwrap();
            let (mut sink, mut source) = futures::StreamExt::split(ws);

            futures::SinkExt::send(&mut sink, Message::Text("ping".into()))
                .await
                .unwrap();

            loop {
                let Some(Ok(Message::Text(text))) = source.next().await else {
                    return None;
                };
                if text.as_str() == "pong" {
                    return Some(text.to_string());
                }
            }
        });

        let backend = backend_on(port);
        // Any request establishes the connection; the server never answers it.
        let _ = tokio::time::timeout(
            Duration::from_millis(500),
            backend.request("eth_chainId", json!([])),
        )
        .await;

        let received = tokio::time::timeout(Duration::from_secs(5), pong)
            .await
            .expect("timed out waiting for pong")
            .unwrap();

        assert_eq!(received.as_deref(), Some("pong"));
    }

    #[tokio::test]
    async fn cancelling_a_request_does_not_leak_its_pending_entry() {
        // The server accepts the request but never answers it, so the only
        // way this resolves is via the outer timeout below — which drops the
        // `request()` future before it ever completes on its own, the same
        // way an MCP host's own call-level timeout would.
        let port = spawn_echo_server(|_, _| Reply::Ignore);
        let backend = backend_on(port);

        let _ = tokio::time::timeout(
            Duration::from_millis(300),
            backend.request("eth_chainId", json!([])),
        )
        .await;

        let connection = backend.connection().await.unwrap();
        assert_eq!(connection.pending.lock().unwrap().len(), 0);
    }

    #[tokio::test]
    async fn request_on_a_connection_marked_dead_returns_disconnected_promptly() {
        // Simulates the close() race directly: we hold this connection the
        // same way `request()` does internally (via the private
        // `connection()` accessor), and it goes dead — exactly as `close()`
        // marks it — before `send_request` gets to insert and send.
        let port = spawn_echo_server(|_, _| Reply::Ignore);
        let backend = backend_on(port);

        let connection = backend.connection().await.unwrap();
        connection.alive.store(false, Ordering::SeqCst);

        let started = std::time::Instant::now();
        let err = backend
            .send_request(&connection, "eth_chainId", json!([]))
            .await
            .unwrap_err();

        assert!(matches!(err, Error::Disconnected));
        assert!(started.elapsed() < Duration::from_secs(1));
    }

    #[tokio::test]
    async fn an_unreachable_app_is_a_disconnect_not_a_hang() {
        // Bind a port, then drop the listener so nothing is accepting on it.
        let port = {
            let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
            listener.local_addr().unwrap().port()
        };

        let backend = backend_on(port);
        let err = backend.request("eth_chainId", json!([])).await.unwrap_err();

        assert_eq!(
            err.to_string(),
            "ethui is not reachable — is the ethui app running?"
        );
    }

    #[tokio::test]
    async fn a_dropped_socket_fails_the_request_waiting_on_it() {
        let port = spawn_echo_server(|_, _| Reply::Disconnect);

        let backend = backend_on(port);
        let err = backend.request("eth_chainId", json!([])).await.unwrap_err();

        assert_eq!(
            err.to_string(),
            "ethui is not reachable — is the ethui app running?"
        );
    }

    #[tokio::test]
    async fn reconnects_lazily_after_the_app_restarts() {
        // The first connection is dropped without an answer; the second is
        // served normally. A working lazy reconnect turns the second call into
        // a success without any timed backoff.
        let port = spawn_echo_server(|request, connection| {
            if connection == 0 {
                Reply::Disconnect
            } else {
                Reply::Send(success_for(request, json!("0x1")))
            }
        });

        let backend = backend_on(port);

        let first = backend.request("eth_chainId", json!([])).await;
        assert!(first.is_err(), "first call should fail on the dropped socket");

        let second = backend.request("eth_chainId", json!([])).await.unwrap();
        assert_eq!(second, json!("0x1"));
    }

    #[tokio::test]
    async fn close_rejects_requests_still_in_flight() {
        let port = spawn_echo_server(|_, _| Reply::Ignore);

        let backend = Arc::new(backend_on(port));
        let pending = {
            let backend = backend.clone();
            tokio::spawn(async move { backend.request("eth_chainId", json!([])).await })
        };

        // Give the request time to reach the server and register itself.
        tokio::time::sleep(Duration::from_millis(100)).await;
        backend.close().await;

        let err = tokio::time::timeout(Duration::from_secs(5), pending)
            .await
            .expect("close() left the request hanging")
            .unwrap()
            .unwrap_err();

        assert_eq!(
            err.to_string(),
            "ethui is not reachable — is the ethui app running?"
        );
    }

    #[tokio::test]
    async fn a_silent_app_times_out() {
        let port = spawn_echo_server(|_, _| Reply::Ignore);

        let backend = WsBackend::with_url(format!("ws://127.0.0.1:{port}"))
            .with_timeout(Duration::from_millis(200));

        let err = backend.request("eth_chainId", json!([])).await.unwrap_err();

        assert_eq!(err.to_string(), "request timed out");
    }

    #[test]
    fn builds_the_peer_identity_query_string() {
        let backend = WsBackend::new(9102);

        assert_eq!(
            backend.url(),
            "ws://127.0.0.1:9102?url=mcp%3A%2F%2Fclaude&origin=claude-mcp"
        );
    }
}
