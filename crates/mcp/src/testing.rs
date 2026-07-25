//! A minimal stand-in for `ethui-ws`, for tests. Test-only.

use std::sync::Arc;

use futures::{SinkExt as _, StreamExt as _};
use serde_json::Value;
use tokio::{net::TcpListener, sync::mpsc};
use tokio_tungstenite::tungstenite::{
    Message,
    handshake::server::{ErrorResponse, Request, Response},
};

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
    spawn_echo_server_inner(responder, None)
}

/// Like [`spawn_echo_server`], but also reports the HTTP request URI of each
/// connection's WebSocket upgrade — the exact bytes the server received, as
/// opposed to what `WsBackend::url()` merely claims it built.
///
/// `spawn_echo_server` accepts via `accept_async`, which discards the
/// upgrade request's URI entirely; that's how a URL missing its path
/// separator once passed every test in this suite while breaking every real
/// connection (peer identity silently fell back to `origin: "unknown"` on
/// the server side — see `crates/ws/src/peers.rs`). This variant uses
/// `accept_hdr_async` to capture what the server actually saw, so a test can
/// assert on it directly instead of trusting `WsBackend::url()`'s own
/// account of itself.
pub(crate) fn spawn_echo_server_capturing_uri<F>(
    responder: F,
) -> (u16, mpsc::UnboundedReceiver<String>)
where
    F: Fn(&Value, usize) -> Reply + Send + Sync + 'static,
{
    let (uri_tx, uri_rx) = mpsc::unbounded_channel();
    let port = spawn_echo_server_inner(responder, Some(uri_tx));
    (port, uri_rx)
}

fn spawn_echo_server_inner<F>(responder: F, uri_tx: Option<mpsc::UnboundedSender<String>>) -> u16
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
            let uri_tx = uri_tx.clone();

            tokio::spawn(async move {
                let callback = move |req: &Request, res: Response| {
                    if let Some(uri_tx) = uri_tx {
                        let _ = uri_tx.send(req.uri().to_string());
                    }
                    Ok::<Response, ErrorResponse>(res)
                };
                let ws = tokio_tungstenite::accept_hdr_async(stream, callback)
                    .await
                    .unwrap();
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
