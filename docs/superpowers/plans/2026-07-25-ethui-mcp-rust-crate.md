# ethui MCP Rust Crate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `crates/mcp` — a Rust MCP stdio server binary (`ethui-mcp`) that relays tool calls to a running ethui app over its WebSocket JSON-RPC port.

**Architecture:** A short-lived process Claude spawns. It speaks MCP over stdio (rmcp) and reaches ethui through a `Backend` trait whose only implementation for now is `WsBackend` (WebSocket JSON-RPC to `ethui-ws`). The trait is the seam that later lets a headless in-process `LocalBackend` call `ethui_rpc::Handler` directly without rewriting tool logic. This phase ships the architecture plus one smoke tool (`get_chain`); the full tool catalog is separate work.

**Tech Stack:** Rust 2024 edition (nightly toolchain), `rmcp` 3.0.0-beta.2, `tokio-tungstenite` 0.28, `tokio`, `schemars` 1.0, `thiserror`, `tracing-subscriber`.

**Spec:** `docs/superpowers/specs/2026-07-25-ethui-mcp-rust-crate-design.md`

## Global Constraints

- **Nothing may ever write to stdout except the MCP transport.** No `println!`, no `dbg!`, no stdout tracing layer. A single stray line corrupts the protocol for the whole session. All logging goes to `std::io::stderr`.
- **Do not call `ethui_tracing::setup()`.** It installs a stdout `fmt` layer (`crates/tracing/src/lib.rs:37`). `main.rs` builds its own subscriber.
- **The `ethui-mcp` binary must not carry a `windows_subsystem` attribute.** `bin/src/lib.rs:2` has `#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]`, which detaches stdio on Windows release builds. This crate must not copy it.
- **`rmcp` is pinned to `=3.0.0-beta.2`.** It is pre-release; the API moves between betas. Do not relax to `^3.0.0-beta.2`.
- **Default WS port:** `9102` when `cfg!(debug_assertions)`, else `9002`. Overridable via the `ETHUI_WS_PORT` environment variable. These match `crates/args/src/lib.rs`.
- **Peer identity:** connect with query string `url=mcp://claude&origin=claude-mcp` (percent-encoded). `crates/ws/src/peers.rs:43` parses `url` with `url::Url::host_str()`, so `mcp://claude` yields domain `claude`, which appears in ethui approval dialogs.
- **ethui-ws keepalive is application-level, not WebSocket control frames.** The server sends a `Message::Text("ping")` every 15 seconds (`crates/ws/src/server.rs:119`) and accepts `Message::Text("pong")` (`crates/ws/src/server.rs:134`). Replying at the WebSocket control-frame layer alone is not enough.
- **User-facing error strings are sentences.** The agent shows them to a human. Never surface a `Debug` format or a backtrace.

### Deviations from the spec

Two, both deliberate:

- The spec's dependency list includes `ethui-types` for alloy re-exports. This phase does not need it: `get_chain` parses a hex quantity with `u64::from_str_radix`, and adding an unused dependency is noise. Add `ethui-types` in the tool-catalog phase, where address and balance handling actually require it. This plan adds `color-eyre` instead, which the spec did not list — `main` returns `color_eyre::Result`, matching the rest of the workspace.
- The spec names the tool file `src/tools.rs`. This plan calls it `src/server.rs`, because it holds the `EthuiMcp` server struct and its `ServerHandler` implementation as well as the tool handlers. When the tool catalog grows, splitting the handlers back out into `src/tools.rs` is the natural next move.

---

### Task 1: Crate foundations — scaffold, errors, Backend trait

Creates the crate, wires it into the workspace, and defines the two contracts every later task depends on: the error type (whose `Display` strings are the user-facing copy) and the `Backend` trait.

**Files:**
- Create: `crates/mcp/Cargo.toml`
- Create: `crates/mcp/src/lib.rs`
- Create: `crates/mcp/src/error.rs`
- Create: `crates/mcp/src/backend.rs`
- Create: `crates/mcp/src/mock.rs`
- Modify: `Cargo.toml` (workspace `members` and `workspace.dependencies`)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `ethui_mcp::error::Error` — enum with variants `Rpc { code: i64, message: String }`, `Disconnected`, `Timeout`.
  - `ethui_mcp::error::Result<T> = std::result::Result<T, Error>`.
  - `ethui_mcp::backend::Backend` — `async fn request(&self, method: &str, params: Value) -> Result<Value>`, with `Send + Sync + 'static` supertraits.
  - `crate::mock::MockBackend` and `crate::mock::MockResponse` — test-only, `#[cfg(test)]`.

- [ ] **Step 1: Add the crate to the workspace**

In the root `Cargo.toml`, add `"crates/mcp",` to the `[workspace] members` list (after `"crates/walletconnect",`), and add this line to `[workspace.dependencies]` alongside the other `ethui-*` path entries:

```toml
ethui-mcp = { path = "crates/mcp" }
```

Leave `default-members = ["bin"]` unchanged — this crate is built explicitly, not as part of a plain `cargo build`.

- [ ] **Step 2: Write `crates/mcp/Cargo.toml`**

```toml
[package]
name = "ethui-mcp"
version.workspace = true
edition.workspace = true
license.workspace = true
homepage.workspace = true
repository.workspace = true
exclude.workspace = true
authors.workspace = true

[lib]
name = "ethui_mcp"

[[bin]]
name = "ethui-mcp"
path = "src/main.rs"

[dependencies]
rmcp = { version = "=3.0.0-beta.2", features = [
  "server",
  "macros",
  "transport-io",
] }
schemars = "1.0"

tokio = { workspace = true, features = ["macros", "io-std"] }
tokio-tungstenite.workspace = true
futures.workspace = true

serde.workspace = true
serde_json.workspace = true
async-trait.workspace = true
thiserror.workspace = true
tracing.workspace = true
tracing-subscriber = { version = "0.3", features = ["env-filter", "fmt"] }
```

`transport-io` is rmcp's server-side stdio transport and is **not** a default feature. `tokio`'s workspace entry only enables `rt-multi-thread`, `sync` and `signal`; `macros` (for `#[tokio::main]`) and `io-std` (for stdin/stdout) are added here. Cargo features are additive, so this does not affect other crates.

- [ ] **Step 3: Write the failing test for error messages**

Create `crates/mcp/src/error.rs` containing only the test module, so the test compiles against a type that does not exist yet:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rpc_error_renders_code_and_message() {
        let err = Error::Rpc {
            code: -32603,
            message: "user rejected the request".into(),
        };

        assert_eq!(
            err.to_string(),
            "RPC error -32603: user rejected the request"
        );
    }

    #[test]
    fn disconnected_error_tells_the_user_to_check_the_app() {
        assert_eq!(
            Error::Disconnected.to_string(),
            "ethui is not reachable — is the ethui app running?"
        );
    }

    #[test]
    fn timeout_error_is_a_plain_sentence() {
        assert_eq!(Error::Timeout.to_string(), "request timed out");
    }
}
```

Create `crates/mcp/src/lib.rs` containing exactly:

```rust
pub mod error;
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `cargo test -p ethui-mcp`
Expected: FAIL to compile, `cannot find type 'Error' in this scope`.

- [ ] **Step 5: Implement the error type**

Prepend to `crates/mcp/src/error.rs`, above the test module:

```rust
use thiserror::Error;

/// Everything that can go wrong talking to ethui.
///
/// The `Display` strings are user-facing: they are handed to the agent, which
/// shows them to a human. Keep them as sentences.
#[derive(Debug, Error)]
pub enum Error {
    /// ethui answered, but with a JSON-RPC error. Covers user rejection of an
    /// approval dialog.
    #[error("RPC error {code}: {message}")]
    Rpc { code: i64, message: String },

    /// No usable connection to the ethui app.
    #[error("ethui is not reachable — is the ethui app running?")]
    Disconnected,

    /// ethui accepted the request but never answered.
    #[error("request timed out")]
    Timeout,
}

pub type Result<T> = std::result::Result<T, Error>;
```

Note the em dash and spacing in the `Disconnected` message — the test compares exactly.

- [ ] **Step 6: Run the test to verify it passes**

Run: `cargo test -p ethui-mcp`
Expected: PASS, 3 tests.

- [ ] **Step 7: Write the failing test for the mock backend**

Create `crates/mcp/src/mock.rs`:

```rust
//! Test double for [`Backend`]. Test-only — never compiled into the binary.

use std::sync::{Arc, Mutex};

use async_trait::async_trait;
use serde_json::Value;

use crate::{
    backend::Backend,
    error::{Error, Result},
};

/// What a [`MockBackend`] answers with, for every call it receives.
pub(crate) enum MockResponse {
    Ok(Value),
    Rpc { code: i64, message: String },
    Disconnected,
}

/// Records every `(method, params)` it is called with and replays a canned
/// response.
#[derive(Clone)]
pub(crate) struct MockBackend {
    calls: Arc<Mutex<Vec<(String, Value)>>>,
    response: Arc<MockResponse>,
}

impl MockBackend {
    /// A backend that answers every request with `value`.
    pub(crate) fn returning(value: Value) -> Self {
        Self::responding(MockResponse::Ok(value))
    }

    /// A backend that answers every request with a specific failure.
    pub(crate) fn responding(response: MockResponse) -> Self {
        Self {
            calls: Default::default(),
            response: Arc::new(response),
        }
    }

    /// Every call received so far, in order.
    pub(crate) fn calls(&self) -> Vec<(String, Value)> {
        self.calls.lock().unwrap().clone()
    }
}

#[async_trait]
impl Backend for MockBackend {
    async fn request(&self, method: &str, params: Value) -> Result<Value> {
        self.calls
            .lock()
            .unwrap()
            .push((method.to_owned(), params));

        match &*self.response {
            MockResponse::Ok(value) => Ok(value.clone()),
            MockResponse::Rpc { code, message } => Err(Error::Rpc {
                code: *code,
                message: message.clone(),
            }),
            MockResponse::Disconnected => Err(Error::Disconnected),
        }
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    #[tokio::test]
    async fn records_calls_and_replays_the_canned_value() {
        let mock = MockBackend::returning(json!("0x1"));

        let result = mock.request("eth_chainId", json!([])).await.unwrap();

        assert_eq!(result, json!("0x1"));
        assert_eq!(
            mock.calls(),
            vec![("eth_chainId".to_owned(), json!([]))]
        );
    }

    #[tokio::test]
    async fn replays_a_canned_rpc_failure() {
        let mock = MockBackend::responding(MockResponse::Rpc {
            code: -32000,
            message: "nope".into(),
        });

        let err = mock.request("eth_chainId", json!([])).await.unwrap_err();

        assert_eq!(err.to_string(), "RPC error -32000: nope");
    }
}
```

Update `crates/mcp/src/lib.rs` to:

```rust
pub mod backend;
pub mod error;

#[cfg(test)]
mod mock;
```

- [ ] **Step 8: Run the test to verify it fails**

Run: `cargo test -p ethui-mcp`
Expected: FAIL to compile, `file not found for module 'backend'`.

- [ ] **Step 9: Implement the Backend trait**

Create `crates/mcp/src/backend.rs`:

```rust
use async_trait::async_trait;
use serde_json::Value;

use crate::error::Result;

/// How tools reach ethui.
///
/// Deliberately one method at JSON-RPC granularity rather than a semantic
/// facade (`accounts()`, `balance()`, …). `WsBackend` implements it over a
/// WebSocket to a running app; a future `LocalBackend` will implement the same
/// trait by calling `ethui_rpc::Handler` directly in-process, with no socket
/// and no serialization hop. Tools are written once and work under both.
#[async_trait]
pub trait Backend: Send + Sync + 'static {
    /// Issue a JSON-RPC call and return its `result` field.
    async fn request(&self, method: &str, params: Value) -> Result<Value>;
}
```

- [ ] **Step 10: Run the tests to verify they pass**

Run: `cargo test -p ethui-mcp`
Expected: PASS, 5 tests.

- [ ] **Step 11: Verify the crate lints clean**

Run: `cargo clippy -p ethui-mcp --all-targets`
Expected: no warnings.

- [ ] **Step 12: Commit**

```bash
git add Cargo.toml Cargo.lock crates/mcp
git commit -m "feat(mcp): scaffold ethui-mcp crate with error type and Backend trait"
```

---

### Task 2: WsBackend — connect, request/response correlation, keepalive

The WebSocket client. This task covers the happy path: connecting, sending JSON-RPC requests, matching responses to requests by id while several are in flight, and answering ethui's application-level `ping`.

**Files:**
- Create: `crates/mcp/src/ws.rs`
- Create: `crates/mcp/src/testing.rs`
- Modify: `crates/mcp/src/lib.rs`

**Interfaces:**
- Consumes: `crate::backend::Backend`, `crate::error::{Error, Result}` (Task 1).
- Produces:
  - `ethui_mcp::ws::WsBackend` with `WsBackend::new(port: u16) -> Self`, `WsBackend::with_url(url: impl Into<String>) -> Self`, `WsBackend::with_timeout(self, timeout: Duration) -> Self`, and `WsBackend::close(&self)`.
  - `ethui_mcp::ws::DEFAULT_TIMEOUT: Duration` (120s).
  - `crate::testing::spawn_echo_server(responder) -> u16` — test-only helper returning the bound port.

- [ ] **Step 1: Write the test-server helper**

Create `crates/mcp/src/testing.rs`. This is scaffolding for the tests in this task and Task 3, not a deliverable of its own.

```rust
//! A minimal stand-in for `ethui-ws`, for tests. Test-only.

use std::sync::Arc;

use futures::{SinkExt as _, StreamExt as _};
use serde_json::Value;
use tokio::net::TcpListener;
use tokio_tungstenite::tungstenite::Message;

/// What the fake server should do with one incoming JSON-RPC request.
pub(crate) enum Reply {
    /// Send this JSON value back.
    Send(Value),
    /// Read the request and stay silent.
    Ignore,
    /// Drop the connection without answering.
    Disconnect,
}

/// Start a fake ethui WS server on an ephemeral port and return that port.
///
/// It keeps accepting connections for the lifetime of the test, so a client
/// that reconnects is served again. `responder` is called once per incoming
/// JSON-RPC request, with the parsed request and a zero-based index of which
/// connection it arrived on.
pub(crate) fn spawn_echo_server<F>(responder: F) -> u16
where
    F: Fn(&Value, usize) -> Reply + Send + Sync + 'static,
{
    let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
    listener.set_nonblocking(true).unwrap();
    let port = listener.local_addr().unwrap().port();
    let responder = Arc::new(responder);

    tokio::spawn(async move {
        let listener = TcpListener::from_std(listener).unwrap();
        let mut connection = 0usize;

        while let Ok((stream, _)) = listener.accept().await {
            let responder = responder.clone();
            let index = connection;
            connection += 1;

            tokio::spawn(async move {
                let ws = tokio_tungstenite::accept_async(stream).await.unwrap();
                let (mut sink, mut source) = ws.split();

                while let Some(Ok(message)) = source.next().await {
                    let Message::Text(text) = message else {
                        continue;
                    };
                    if text.as_str() == "pong" {
                        continue;
                    }
                    let request: Value = serde_json::from_str(text.as_str()).unwrap();

                    match responder(&request, index) {
                        Reply::Send(response) => {
                            let _ = sink.send(Message::Text(response.to_string().into())).await;
                        }
                        Reply::Ignore => {}
                        Reply::Disconnect => break,
                    }
                }
            });
        }
    });

    port
}

/// Build a JSON-RPC success response for `request`.
pub(crate) fn success_for(request: &Value, result: Value) -> Value {
    serde_json::json!({
        "jsonrpc": "2.0",
        "id": request["id"],
        "result": result,
    })
}
```

Binding with `std::net::TcpListener` first and converting means the port is reserved before `spawn_echo_server` returns, so a test can connect immediately without racing the spawned task.

- [ ] **Step 2: Write the failing tests for the happy path**

Create `crates/mcp/src/ws.rs` containing only the test module:

```rust
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

    #[test]
    fn builds_the_peer_identity_query_string() {
        let backend = WsBackend::new(9102);

        assert_eq!(
            backend.url(),
            "ws://127.0.0.1:9102?url=mcp%3A%2F%2Fclaude&origin=claude-mcp"
        );
    }
}
```

Update `crates/mcp/src/lib.rs` to:

```rust
pub mod backend;
pub mod error;
pub mod ws;

#[cfg(test)]
mod mock;
#[cfg(test)]
mod testing;
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `cargo test -p ethui-mcp ws::`
Expected: FAIL to compile, `cannot find type 'WsBackend' in this scope`.

- [ ] **Step 4: Implement WsBackend**

Prepend to `crates/mcp/src/ws.rs`, above the test module:

```rust
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
        let id = self.next_id.fetch_add(1, Ordering::Relaxed);
        let (sender, receiver) = oneshot::channel();

        connection.pending.lock().unwrap().insert(id, sender);

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
            connection.pending.lock().unwrap().remove(&id);
            return Err(Error::Disconnected);
        }

        match tokio::time::timeout(self.timeout, receiver).await {
            Ok(Ok(outcome)) => outcome,
            // The connection dropped the sender without answering.
            Ok(Err(_)) => Err(Error::Disconnected),
            Err(_) => {
                connection.pending.lock().unwrap().remove(&id);
                Err(Error::Timeout)
            }
        }
    }
}
```

The `if let … && …` chain in `connection()` is let-chains, stable in edition 2024, which this workspace uses.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cargo test -p ethui-mcp ws::`
Expected: PASS, 6 tests.

- [ ] **Step 6: Verify lints are clean**

Run: `cargo clippy -p ethui-mcp --all-targets`
Expected: no warnings.

- [ ] **Step 7: Commit**

```bash
git add crates/mcp
git commit -m "feat(mcp): add WsBackend with JSON-RPC id correlation and keepalive"
```

---

### Task 3: WsBackend — disconnect, reconnect and close

Failure behaviour. This is where the design's promises about a missing app, a restarted app, and shutdown get enforced.

**Files:**
- Modify: `crates/mcp/src/ws.rs` (tests only — the implementation from Task 2 should already satisfy them)

**Interfaces:**
- Consumes: everything from Task 2.
- Produces: no new public API.

- [ ] **Step 1: Write the failing tests**

Add these tests inside the existing `mod tests` block in `crates/mcp/src/ws.rs`:

```rust
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
```

`close_rejects_requests_still_in_flight` needs `use std::sync::Arc;` — add it to the test module's imports if it is not already in scope via `use super::*;` (it is, since `ws.rs` imports `Arc` at the top).

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cargo test -p ethui-mcp ws::`
Expected: the new tests fail. Which ones fail depends on Task 2's implementation; the likely failures are `a_dropped_socket_fails_the_request_waiting_on_it` and `close_rejects_requests_still_in_flight` if the reader task does not drain the pending map, and `reconnects_lazily_after_the_app_restarts` if `is_alive` is not driven by the reader task ending.

If all five pass immediately, Task 2's implementation already satisfies them. That is a valid outcome — do not weaken the implementation to manufacture a red test. Record it and move to Step 4.

- [ ] **Step 3: Fix the implementation until the tests pass**

The three mechanisms these tests exercise, all in `crates/mcp/src/ws.rs`:

1. The reader task must call `reader_alive.store(false, Ordering::SeqCst)` and `fail_all(&reader_pending)` when its loop ends, so a dropped socket fails its own pending requests rather than leaving them to time out.
2. `Connection::is_alive` must read that flag, so `connection()` opens a fresh socket on the next call instead of handing back a dead one.
3. `close()` must both mark the connection dead and drain its pending map.

- [ ] **Step 4: Run the whole suite**

Run: `cargo test -p ethui-mcp`
Expected: PASS, 16 tests (3 error + 2 mock + 11 ws).

- [ ] **Step 5: Verify lints are clean**

Run: `cargo clippy -p ethui-mcp --all-targets`
Expected: no warnings.

- [ ] **Step 6: Commit**

```bash
git add crates/mcp
git commit -m "test(mcp): cover WsBackend disconnect, lazy reconnect and close"
```

---

### Task 4: MCP server and the `get_chain` tool

The rmcp layer: a server struct generic over `Backend`, a tool router, and one tool that proves the path end to end.

**Files:**
- Create: `crates/mcp/src/server.rs`
- Modify: `crates/mcp/src/lib.rs`

**Interfaces:**
- Consumes: `crate::backend::Backend`, `crate::error::Error` (Task 1); `crate::mock::MockBackend` for tests.
- Produces:
  - `ethui_mcp::server::EthuiMcp<B: Backend>` with `EthuiMcp::new(backend: Arc<B>) -> Self`.
  - `EthuiMcp::get_chain(&self) -> std::result::Result<String, rmcp::ErrorData>` — the tool handler, callable directly in tests.
  - `impl<B: Backend> rmcp::ServerHandler for EthuiMcp<B>`.

- [ ] **Step 1: Write the failing tests**

Create `crates/mcp/src/server.rs` containing only the test module:

```rust
#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;
    use crate::mock::{MockBackend, MockResponse};

    #[tokio::test]
    async fn get_chain_calls_eth_chain_id() {
        let backend = Arc::new(MockBackend::returning(json!("0x1")));
        let server = EthuiMcp::new(backend.clone());

        server.get_chain().await.unwrap();

        assert_eq!(backend.calls(), vec![("eth_chainId".to_owned(), json!([]))]);
    }

    #[tokio::test]
    async fn get_chain_renders_the_hex_quantity_as_decimal() {
        let backend = Arc::new(MockBackend::returning(json!("0x7a69")));
        let server = EthuiMcp::new(backend);

        assert_eq!(server.get_chain().await.unwrap(), "31337");
    }

    #[tokio::test]
    async fn get_chain_surfaces_a_backend_failure_as_a_sentence() {
        let backend = Arc::new(MockBackend::responding(MockResponse::Disconnected));
        let server = EthuiMcp::new(backend);

        let err = server.get_chain().await.unwrap_err();

        assert_eq!(
            err.message,
            "ethui is not reachable — is the ethui app running?"
        );
    }

    #[tokio::test]
    async fn get_chain_rejects_a_non_hex_answer() {
        let backend = Arc::new(MockBackend::returning(json!("banana")));
        let server = EthuiMcp::new(backend);

        let err = server.get_chain().await.unwrap_err();

        assert!(
            err.message.contains("banana"),
            "error should quote what ethui actually returned, got: {}",
            err.message
        );
    }

    #[test]
    fn advertises_tools_and_identifies_itself_as_ethui_mcp() {
        let server = EthuiMcp::new(Arc::new(MockBackend::returning(json!("0x1"))));

        let info = server.get_info();

        assert_eq!(info.server_info.name, "ethui-mcp");
        assert!(info.capabilities.tools.is_some(), "tools capability must be advertised");
    }

    #[test]
    fn exposes_get_chain_in_the_tool_list() {
        let server = EthuiMcp::new(Arc::new(MockBackend::returning(json!("0x1"))));

        let names: Vec<_> = server
            .tool_router
            .list_all()
            .into_iter()
            .map(|tool| tool.name.to_string())
            .collect();

        assert_eq!(names, vec!["get_chain".to_owned()]);
    }
}
```

Update `crates/mcp/src/lib.rs` to add `pub mod server;`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cargo test -p ethui-mcp server::`
Expected: FAIL to compile, `cannot find type 'EthuiMcp' in this scope`.

- [ ] **Step 3: Implement the server**

Prepend to `crates/mcp/src/server.rs`, above the test module:

```rust
use std::sync::Arc;

use rmcp::{
    ErrorData as McpError, ServerHandler,
    handler::server::router::tool::ToolRouter,
    model::{Implementation, ServerCapabilities, ServerInfo},
    tool, tool_handler, tool_router,
};
use serde_json::json;

use crate::{backend::Backend, error::Error};

/// The MCP server ethui exposes to an agent.
///
/// Generic over [`Backend`] so the same tools work over a WebSocket to a
/// running app today and, later, against an in-process handler.
pub struct EthuiMcp<B: Backend> {
    backend: Arc<B>,
    tool_router: ToolRouter<Self>,
}

// Written by hand rather than derived: `#[derive(Clone)]` would demand
// `B: Clone`, which `Arc<B>` makes unnecessary.
impl<B: Backend> Clone for EthuiMcp<B> {
    fn clone(&self) -> Self {
        Self {
            backend: self.backend.clone(),
            tool_router: self.tool_router.clone(),
        }
    }
}

/// Turn an internal failure into the string the agent shows a human.
fn tool_error(error: Error) -> McpError {
    McpError::internal_error(error.to_string(), None)
}

#[tool_router(router = tool_router)]
impl<B: Backend> EthuiMcp<B> {
    pub fn new(backend: Arc<B>) -> Self {
        Self {
            backend,
            tool_router: Self::tool_router(),
        }
    }

    #[tool(description = "Get the EVM chain id ethui is currently connected to.")]
    pub async fn get_chain(&self) -> std::result::Result<String, McpError> {
        let raw = self
            .backend
            .request("eth_chainId", json!([]))
            .await
            .map_err(tool_error)?;

        let hex = raw.as_str().ok_or_else(|| {
            McpError::internal_error(
                format!("ethui returned a non-string chain id: {raw}"),
                None,
            )
        })?;

        let chain_id = u64::from_str_radix(hex.trim_start_matches("0x"), 16)
            .map_err(|_| {
                McpError::internal_error(
                    format!("ethui returned an unparseable chain id: {hex}"),
                    None,
                )
            })?;

        Ok(chain_id.to_string())
    }
}

#[tool_handler(router = self.tool_router)]
impl<B: Backend> ServerHandler for EthuiMcp<B> {
    fn get_info(&self) -> ServerInfo {
        // `ServerInfo::new` fills `server_info` from rmcp's own build
        // environment, which would name this server "rmcp". Override it.
        let mut info = ServerInfo::new(ServerCapabilities::builder().enable_tools().build());
        info.server_info = Implementation::new("ethui-mcp", env!("CARGO_PKG_VERSION"));
        info
    }
}
```

`InitializeResult` (aliased as `ServerInfo`) is `#[non_exhaustive]`, so it cannot be built with a struct literal from outside rmcp. Assigning a field on an owned value, as above, is allowed.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cargo test -p ethui-mcp server::`
Expected: PASS, 6 tests.

- [ ] **Step 5: Run the whole suite and lints**

Run: `cargo test -p ethui-mcp && cargo clippy -p ethui-mcp --all-targets`
Expected: 22 tests pass, no clippy warnings.

- [ ] **Step 6: Commit**

```bash
git add crates/mcp
git commit -m "feat(mcp): add rmcp server with the get_chain tool"
```

---

### Task 5: The `ethui-mcp` binary

Wires everything to stdio. This is where the two protocol hazards from the Global Constraints are actually defused.

**Files:**
- Create: `crates/mcp/src/main.rs`
- Modify: `crates/mcp/src/lib.rs`

**Interfaces:**
- Consumes: `ethui_mcp::server::EthuiMcp`, `ethui_mcp::ws::WsBackend` (Tasks 2 and 4).
- Produces:
  - `ethui_mcp::default_ws_port() -> u16` — `9102` under `debug_assertions`, else `9002`.
  - `ethui_mcp::ws_port_from_env() -> u16` — reads `ETHUI_WS_PORT`, falling back to `default_ws_port()`.
  - The `ethui-mcp` executable.

- [ ] **Step 1: Write the failing tests for port resolution**

Add to the bottom of `crates/mcp/src/lib.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_port_follows_the_build_profile() {
        // Matches crates/args/src/lib.rs, so the sidecar and the app agree.
        let expected = if cfg!(debug_assertions) { 9102 } else { 9002 };
        assert_eq!(default_ws_port(), expected);
    }

    #[test]
    fn env_override_wins_over_the_default() {
        assert_eq!(parse_ws_port(Some("9002".to_owned())), 9002);
    }

    #[test]
    fn an_unparseable_env_value_falls_back_to_the_default() {
        assert_eq!(parse_ws_port(Some("banana".to_owned())), default_ws_port());
    }

    #[test]
    fn a_missing_env_value_falls_back_to_the_default() {
        assert_eq!(parse_ws_port(None), default_ws_port());
    }
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cargo test -p ethui-mcp --lib tests::`
Expected: FAIL to compile, `cannot find function 'default_ws_port' in this scope`.

- [ ] **Step 3: Implement port resolution**

Make `crates/mcp/src/lib.rs` read, above its test module:

```rust
pub mod backend;
pub mod error;
pub mod server;
pub mod ws;

#[cfg(test)]
mod mock;
#[cfg(test)]
mod testing;

/// The WS port ethui listens on, per build profile.
///
/// Mirrors `default_ws_port` in `crates/args/src/lib.rs`. A debug sidecar talks
/// to a debug app.
pub const fn default_ws_port() -> u16 {
    if cfg!(debug_assertions) { 9102 } else { 9002 }
}

/// Resolve a port from an `ETHUI_WS_PORT` value, falling back to the default.
///
/// A malformed value falls back rather than failing: the sidecar is launched by
/// Claude with no terminal to complain to, and a clear "not reachable" error on
/// the first tool call is more useful than a silent startup crash.
pub fn parse_ws_port(value: Option<String>) -> u16 {
    value
        .and_then(|value| value.parse().ok())
        .unwrap_or_else(default_ws_port)
}

/// Resolve the port from the process environment.
pub fn ws_port_from_env() -> u16 {
    parse_ws_port(std::env::var("ETHUI_WS_PORT").ok())
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cargo test -p ethui-mcp --lib tests::`
Expected: PASS, 4 tests.

- [ ] **Step 5: Write the binary**

Create `crates/mcp/src/main.rs`:

```rust
use std::sync::Arc;

use ethui_mcp::{server::EthuiMcp, ws::WsBackend, ws_port_from_env};
use rmcp::{ServiceExt as _, transport::stdio};
use tracing_subscriber::{EnvFilter, fmt};

#[tokio::main]
async fn main() -> color_eyre::Result<()> {
    // stdout belongs to the MCP transport. Every log line goes to stderr; a
    // single stray stdout write corrupts the protocol for the whole session.
    // This is also why `ethui_tracing::setup()` must not be called here — it
    // installs a stdout layer.
    fmt()
        .with_writer(std::io::stderr)
        .with_ansi(false)
        .with_env_filter(EnvFilter::from_default_env())
        .init();

    let backend = Arc::new(WsBackend::new(ws_port_from_env()));
    let server = EthuiMcp::new(backend).serve(stdio()).await?;

    server.waiting().await?;

    Ok(())
}
```

`color_eyre` is not yet a dependency of this crate. Add it to `crates/mcp/Cargo.toml` under `[dependencies]`:

```toml
color-eyre.workspace = true
```

- [ ] **Step 6: Verify the binary builds**

Run: `cargo build -p ethui-mcp --bin ethui-mcp`
Expected: builds with no warnings.

- [ ] **Step 7: Verify stdout is clean and the handshake works**

This is the check that matters — it proves nothing pollutes stdout and that the tool is advertised. Run, with no ethui app required:

```bash
printf '%s\n%s\n%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"probe","version":"0"}}}' \
  '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' \
  | RUST_LOG=debug cargo run -q -p ethui-mcp --bin ethui-mcp 2>/dev/null
```

Expected: exactly two JSON lines on stdout and nothing else. The first is an `initialize` result whose `serverInfo.name` is `ethui-mcp`; the second lists one tool named `get_chain`. Discarding stderr while still setting `RUST_LOG=debug` is the point of the test: if any log line appears in this output, the stdout constraint is violated.

- [ ] **Step 8: Verify the failure message when ethui is not running**

```bash
printf '%s\n%s\n%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"probe","version":"0"}}}' \
  '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_chain","arguments":{}}}' \
  | ETHUI_WS_PORT=9999 cargo run -q -p ethui-mcp --bin ethui-mcp 2>/dev/null
```

Expected: the third response carries the message `ethui is not reachable — is the ethui app running?`. Port 9999 is chosen because nothing listens there.

- [ ] **Step 9: Commit**

```bash
git add Cargo.toml Cargo.lock crates/mcp
git commit -m "feat(mcp): add ethui-mcp stdio binary"
```

---

### Task 6: End-to-end verification against a running ethui, and docs

Proves the whole path against the real app, and writes down how to register the server.

**Files:**
- Create: `crates/mcp/README.md`

**Interfaces:**
- Consumes: the `ethui-mcp` binary (Task 5).
- Produces: no code.

- [ ] **Step 1: Verify against a running ethui app**

Ask the user to start the ethui app if it is not already running — per the project's instructions, do not start it yourself. With a dev build running (WS port 9102):

```bash
cargo build -p ethui-mcp --bin ethui-mcp
printf '%s\n%s\n%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"probe","version":"0"}}}' \
  '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_chain","arguments":{}}}' \
  | ./target/debug/ethui-mcp 2>/dev/null
```

Expected: the third response contains the chain id the ethui window is currently showing, as a decimal string. Confirm it matches the app.

Also confirm the connection is attributed correctly: with the sidecar connected, the peer should appear in ethui with domain `claude`.

- [ ] **Step 2: Write the README**

Create `crates/mcp/README.md`:

```markdown
# ethui-mcp

Local MCP stdio server that lets a Claude session drive ethui wallet
operations.

It connects to a running ethui app over its WebSocket JSON-RPC port — the same
one the browser extension uses — as a peer identified `mcp://claude`. It holds
no keys and never signs: signing and sending are gated by ethui's approval
dialog, where the `claude` origin is shown.

## Requirements

- ethui running locally. Dev builds listen on WS port 9102, release builds on
  9002. Override with `ETHUI_WS_PORT`.

## Build

    cargo build --release -p ethui-mcp

The binary lands at `target/release/ethui-mcp`. It is not part of a plain
`cargo build`: the workspace's `default-members` is `["bin"]`.

## Register with Claude Code

    claude mcp add ethui -- /absolute/path/to/target/release/ethui-mcp

Against a dev build of the app:

    claude mcp add ethui --env ETHUI_WS_PORT=9102 -- /absolute/path/to/target/release/ethui-mcp

## Register with Claude Desktop

Add to `claude_desktop_config.json`:

    {
      "mcpServers": {
        "ethui": {
          "command": "/absolute/path/to/target/release/ethui-mcp",
          "env": { "ETHUI_WS_PORT": "9102" }
        }
      }
    }

## Tools

`get_chain` — the current EVM chain id, as a decimal string.

The wider tool catalog (accounts, balances, calls, and the approval-gated
`send_transaction` / `sign_message` / `sign_typed_data`) is separate work.

## Development notes

Two constraints are easy to break and produce confusing failures:

- **Nothing may write to stdout except the MCP transport.** No `println!`, and
  in particular never call `ethui_tracing::setup()` from this binary — it
  installs a stdout tracing layer. All logging goes to stderr.
- **This binary must not carry a `windows_subsystem` attribute.** `bin/` sets
  one for release builds, which detaches stdio on Windows.

`rmcp` is pinned to an exact version because it is pre-release and its API moves
between betas.
```

- [ ] **Step 3: Verify the documented commands work**

Run the build command from the README verbatim and confirm the binary appears at the documented path:

Run: `cargo build --release -p ethui-mcp && ls -l target/release/ethui-mcp`
Expected: the file exists.

- [ ] **Step 4: Run the full suite one last time**

Run: `cargo test -p ethui-mcp && cargo clippy -p ethui-mcp --all-targets`
Expected: 26 tests pass, no clippy warnings.

- [ ] **Step 5: Commit**

```bash
git add crates/mcp/README.md
git commit -m "docs(mcp): add ethui-mcp readme and registration guide"
```

---

## Follow-up work, deliberately not in this plan

Each is separate work with its own plan:

- **The tool catalog** — reads (`get_accounts`, `get_balance`, `get_transaction`, `call`, `get_contract_abi`, `resolve_alias`) and approval-gated writes (`send_transaction`, `sign_message`, `sign_typed_data`, `switch_network`). Adds `ethui-types` for alloy-based address and balance handling.
- **Write serialization** — a `tokio::sync::Mutex` held across state-changing RPCs so parallel agent calls produce an orderly dialog sequence instead of a racy stack. Lands with the first write tool; there is nothing to serialize before then.
- **`LocalBackend` and headless mode** — the payoff for the `Backend` seam.
- **Tauri bundling** — `bundle.externalBin` requires the binary renamed `ethui-mcp-<target-triple>` plus a copy step, and touches CI.
