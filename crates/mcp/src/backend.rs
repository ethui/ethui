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
    ///
    /// `params` must serialize to a JSON array or object. `jsonrpc_core`
    /// (ethui's dispatcher) rejects any request whose `params` is neither —
    /// a bare string or number, say — as a malformed request, before it ever
    /// reaches ethui's own handlers.
    async fn request(&self, method: &str, params: Value) -> Result<Value>;

    /// Which transport session answered the last request.
    ///
    /// Bumped on every fresh connection, so [`crate::registry`] can tell a
    /// reconnect from a steady link and drop what the previous ethui process
    /// told it. A backend with no connection to lose keeps the default.
    fn session(&self) -> u64 {
        0
    }
}
