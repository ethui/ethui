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

/// Generous for a loopback handshake, short enough that a hung `connect_async`
/// doesn't block every concurrent tool call for the full response timeout.
pub const DEFAULT_CONNECT_TIMEOUT: Duration = Duration::from_secs(5);

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
/// notifications — but also, e.g., `crates/ws/src/server.rs`'s
/// `json_rpc_parse_error` response, which answers with `"id": null` when it
/// cannot parse the request at all), are dropped uncorrelated: there is no
/// pending request to fail them onto. Logged rather than silent, so a wedged
/// call that times out because ethui actually answered instantly with
/// something we couldn't correlate leaves a trace to find.
fn dispatch(text: &str, pending: &Pending) {
    let Ok(mut message) = serde_json::from_str::<Value>(text) else {
        debug!("dropping uncorrelatable frame (not JSON): {text}");
        return;
    };
    let Some(id) = message.get("id").and_then(Value::as_u64) else {
        debug!("dropping uncorrelatable frame (no numeric id): {text}");
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
        // Taken rather than cloned: `result` can be a whole block or an ABI,
        // and the parsed message is dropped on the next line anyway.
        None => Ok(message
            .get_mut("result")
            .map(Value::take)
            .unwrap_or(Value::Null)),
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
    connect_timeout: Duration,
    next_id: AtomicU64,
    connection: AsyncMutex<Option<Arc<Connection>>>,
    /// Counts sockets opened, so a reconnect is observable from outside.
    session: AtomicU64,
}

impl WsBackend {
    /// Connect to a local ethui on `port`, identifying as `mcp://claude` so the
    /// origin shows up in approval dialogs.
    pub fn new(port: u16) -> Self {
        Self::with_url(format!(
            "ws://127.0.0.1:{port}/?url=mcp%3A%2F%2Fclaude&origin=claude-mcp"
        ))
    }

    pub fn with_url(url: impl Into<String>) -> Self {
        Self {
            url: url.into(),
            timeout: DEFAULT_TIMEOUT,
            connect_timeout: DEFAULT_CONNECT_TIMEOUT,
            next_id: AtomicU64::new(1),
            connection: AsyncMutex::new(None),
            session: AtomicU64::new(0),
        }
    }

    pub fn with_timeout(mut self, timeout: Duration) -> Self {
        self.timeout = timeout;
        self
    }

    pub fn with_connect_timeout(mut self, connect_timeout: Duration) -> Self {
        self.connect_timeout = connect_timeout;
        self
    }

    pub fn url(&self) -> &str {
        &self.url
    }

    /// Return the live connection, opening one if there is none.
    ///
    /// Holds the `connection` mutex across `self.connect().await`, so one
    /// hung connect attempt blocks every concurrent tool call until it gives
    /// up — bounded by `connect_timeout`, not left open-ended.
    async fn connection(&self) -> Result<Arc<Connection>> {
        let mut guard = self.connection.lock().await;

        if let Some(connection) = guard.as_ref()
            && connection.is_alive()
        {
            return Ok(connection.clone());
        }

        let connection = Arc::new(self.connect().await?);
        // Bumped only on success: a failed connect leaves the session alone, so
        // a cache is not invalidated by an ethui that was never reached.
        self.session.fetch_add(1, Ordering::SeqCst);
        *guard = Some(connection.clone());

        Ok(connection)
    }

    async fn connect(&self) -> Result<Connection> {
        let (stream, _) =
            match tokio::time::timeout(self.connect_timeout, connect_async(&self.url)).await {
                Ok(Ok(pair)) => pair,
                Ok(Err(e)) => {
                    debug!("connect to {} failed: {e}", self.url);
                    return Err(Error::Disconnected);
                }
                Err(_) => {
                    debug!(
                        "connect to {} timed out after {:?}",
                        self.url, self.connect_timeout
                    );
                    return Err(Error::Disconnected);
                }
            };

        let (mut sink, mut source) = stream.split();
        let (outbound, mut to_send) = mpsc::unbounded_channel::<Message>();
        let pending: Pending = Default::default();
        let alive = Arc::new(AtomicBool::new(true));

        let writer_pending = pending.clone();
        let writer_alive = alive.clone();

        // Runs until `to_send` closes (every `outbound` sender dropped) or the
        // socket errors. The handle is intentionally discarded: the task
        // manages its own lifetime, tearing the connection down (marking it
        // dead and failing `pending`) when it exits — otherwise a write
        // failure the reader half never observes would leave `alive` true
        // forever, wedging `connection()` onto a socket that can no longer
        // send anything.
        tokio::spawn(async move {
            while let Some(message) = to_send.recv().await {
                if sink.send(message).await.is_err() {
                    break;
                }
            }

            writer_alive.store(false, Ordering::SeqCst);
            fail_all(&writer_pending);
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

                // "ping"/"pong" are ethui's application-level keepalive, not
                // WebSocket control frames.
                match text.as_str() {
                    "ping" => {
                        let _ = reader_outbound.send(Message::Text("pong".into()));
                    }
                    "pong" => {}
                    frame => dispatch(frame, &reader_pending),
                }
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
            // The writer task has already exited (it drops `to_send`'s
            // receiver on the way out), so it will never reach its own
            // teardown to mark this dead. Do it here instead, or
            // `connection()` keeps handing out a socket that can never send.
            connection.alive.store(false, Ordering::SeqCst);
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

    fn session(&self) -> u64 {
        self.session.load(Ordering::SeqCst)
    }
}

#[cfg(test)]
mod tests {
    use std::time::Duration;

    use serde_json::json;
    use tokio_tungstenite::tungstenite::Message;

    use super::*;
    use crate::testing::{
        Reply, dead_port, reserved_listener, spawn_echo_server, spawn_echo_server_capturing_uri,
        success_for,
    };

    fn backend_on(port: u16) -> WsBackend {
        WsBackend::with_url(format!("ws://127.0.0.1:{port}")).with_timeout(Duration::from_secs(5))
    }

    #[tokio::test]
    async fn returns_the_result_field() {
        let port =
            spawn_echo_server(|request, _| Reply::Send(success_for(request, json!("0x7a69"))));

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
        let err = backend
            .request("eth_sendTransaction", json!([]))
            .await
            .unwrap_err();

        assert_eq!(
            err.to_string(),
            "RPC error -32603: user rejected the request"
        );
    }

    #[tokio::test]
    async fn answers_the_application_level_ping_with_pong() {
        // ethui-ws sends a literal "ping" text frame every 15s and expects a
        // "pong" text frame back. This is not a WebSocket control frame.
        let (listener, port) = reserved_listener();

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
        let backend = backend_on(dead_port());
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
        assert!(
            first.is_err(),
            "first call should fail on the dropped socket"
        );

        let second = backend.request("eth_chainId", json!([])).await.unwrap();
        assert_eq!(second, json!("0x1"));
    }

    #[tokio::test]
    async fn the_session_advances_once_per_socket_opened() {
        // What `MethodRegistry` keys its cache on: a steady link must hold the
        // session still, a reconnect must move it.
        let port = spawn_echo_server(|request, connection| {
            if connection == 0 {
                Reply::Disconnect
            } else {
                Reply::Send(success_for(request, json!("0x1")))
            }
        });

        let backend = backend_on(port);
        assert_eq!(backend.session(), 0, "nothing opened yet");

        let _ = backend.request("eth_chainId", json!([])).await;
        assert_eq!(backend.session(), 1);

        backend.request("eth_chainId", json!([])).await.unwrap();
        assert_eq!(backend.session(), 2, "the reconnect opened a second socket");

        backend.request("eth_chainId", json!([])).await.unwrap();
        assert_eq!(
            backend.session(),
            2,
            "a request reusing a live socket must not look like a reconnect"
        );
    }

    #[tokio::test]
    async fn a_failed_connect_leaves_the_session_alone() {
        // Otherwise every call made while ethui is down would invalidate the
        // registry cache, having reached nothing that could change it.
        let backend = WsBackend::with_url("ws://127.0.0.1:1/")
            .with_connect_timeout(Duration::from_millis(200));

        assert!(backend.request("eth_chainId", json!([])).await.is_err());

        assert_eq!(backend.session(), 0);
    }

    #[tokio::test]
    async fn a_writer_side_failure_clears_alive_so_the_next_request_reconnects() {
        // Any connection this real server accepts answers successfully — it
        // stands in for the *post-reconnect* socket. The backend is then
        // poisoned with a hand-built `Connection` whose write half is
        // already dead (its `outbound` receiver dropped), which is exactly
        // what a writer task leaves behind after `sink.send` fails: `alive`
        // still true, `outbound.send` doomed to fail forever. Without I2's
        // fix, `connection()` would keep handing this same broken connection
        // back out and every future call would return `Disconnected`
        // without ever reconnecting.
        let port = spawn_echo_server(|request, _| Reply::Send(success_for(request, json!("0x1"))));
        let backend = backend_on(port);

        let (outbound, receiver) = mpsc::unbounded_channel::<Message>();
        drop(receiver);
        let broken = Arc::new(Connection {
            outbound,
            pending: Default::default(),
            alive: Arc::new(AtomicBool::new(true)),
        });
        *backend.connection.lock().await = Some(broken.clone());

        let first = backend.request("eth_chainId", json!([])).await;
        assert!(
            first.is_err(),
            "first call should fail on the broken writer"
        );
        assert!(
            !broken.is_alive(),
            "an outbound.send failure must clear alive, or the next call can never reconnect"
        );

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
    async fn a_hung_handshake_times_out_instead_of_blocking_forever() {
        // Accept the TCP connection but never write the HTTP upgrade
        // response, so `connect_async`'s handshake never resolves on its
        // own. Without a connect timeout this would hang for as long as the
        // caller's own request timeout — or, since `connection()` holds the
        // mutex across `connect()`, block every other concurrent tool call
        // too.
        let (listener, port) = reserved_listener();

        tokio::spawn(async move {
            let listener = tokio::net::TcpListener::from_std(listener).unwrap();
            let (_stream, _) = listener.accept().await.unwrap();
            std::future::pending::<()>().await
        });

        let backend = WsBackend::with_url(format!("ws://127.0.0.1:{port}"))
            .with_connect_timeout(Duration::from_millis(200))
            .with_timeout(Duration::from_secs(5));

        let started = std::time::Instant::now();
        let err = backend.request("eth_chainId", json!([])).await.unwrap_err();

        assert!(matches!(err, Error::Disconnected));
        assert!(started.elapsed() < Duration::from_secs(1));
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
    fn dispatch_drops_a_non_json_frame_without_touching_pending() {
        let pending: Pending = Default::default();
        let (sender, mut receiver) = oneshot::channel::<Result<Value>>();
        pending.lock().unwrap().insert(1, sender);

        dispatch("not json", &pending);

        assert_eq!(
            pending.lock().unwrap().len(),
            1,
            "the pending entry must survive"
        );
        assert!(
            receiver.try_recv().is_err(),
            "an uncorrelatable frame must not resolve a pending request"
        );
    }

    #[test]
    fn dispatch_drops_a_frame_without_a_numeric_id_without_touching_pending() {
        let pending: Pending = Default::default();
        let (sender, mut receiver) = oneshot::channel::<Result<Value>>();
        pending.lock().unwrap().insert(1, sender);

        // Mirrors `crates/ws/src/server.rs`'s `json_rpc_parse_error`
        // response, sent when it cannot parse the request at all.
        dispatch(
            r#"{"jsonrpc":"2.0","error":{"code":-32700,"message":"Parse error"},"id":null}"#,
            &pending,
        );

        assert_eq!(
            pending.lock().unwrap().len(),
            1,
            "the pending entry must survive"
        );
        assert!(
            receiver.try_recv().is_err(),
            "an uncorrelatable frame must not resolve a pending request"
        );
    }

    #[test]
    fn builds_the_peer_identity_query_string() {
        let backend = WsBackend::new(9102);

        assert_eq!(
            backend.url(),
            "ws://127.0.0.1:9102/?url=mcp%3A%2F%2Fclaude&origin=claude-mcp"
        );
    }

    #[tokio::test]
    async fn the_production_url_survives_a_real_handshake() {
        // Every other test in this module goes through `with_url` with a bare
        // `ws://127.0.0.1:{port}`, bypassing `new`'s own URL construction
        // entirely. That's how a request line missing its `/` — well-formed
        // enough to unit-test as a string, fatal to an actual HTTP handshake
        // — passed the whole suite while breaking every real connection.
        // `spawn_echo_server_capturing_uri` performs a real handshake via
        // `tokio_tungstenite::accept_hdr_async`, so a malformed request line
        // fails here exactly as it did against the live app.
        let (port, mut uris) = spawn_echo_server_capturing_uri(|request, _| {
            Reply::Send(success_for(request, json!("0x1")))
        });

        let backend = WsBackend::new(port).with_timeout(Duration::from_secs(5));
        let result = backend.request("eth_chainId", json!([])).await.unwrap();

        assert_eq!(result, json!("0x1"));

        // Not just "the handshake succeeded" — assert on the exact bytes the
        // server received, decoded the same way `crates/ws/src/server.rs`
        // decodes them (`Url::parse` against a synthetic base, then
        // `query_pairs()`). This is the assertion that can actually fail:
        // `builds_the_peer_identity_query_string` below only checks that
        // `WsBackend::url()` echoes back the literal it built, which is true
        // by construction and proves nothing about what went over the wire.
        let uri = uris.recv().await.expect("server never saw a connection");
        let parsed = url::Url::parse(&format!("http://localhost{uri}")).unwrap();
        let query_params: std::collections::HashMap<String, String> =
            parsed.query_pairs().into_owned().collect();

        assert_eq!(
            query_params.get("url").map(String::as_str),
            Some("mcp://claude")
        );
        assert_eq!(
            query_params.get("origin").map(String::as_str),
            Some("claude-mcp")
        );
    }
}
