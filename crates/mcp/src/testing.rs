//! A minimal stand-in for `ethui-ws`, for tests. Test-only.

use std::sync::Arc;

use futures::{SinkExt as _, StreamExt as _};
use serde_json::Value;
use tokio::net::TcpListener;
use tokio_tungstenite::tungstenite::Message;

/// What the fake server should do with one incoming JSON-RPC request.
// `Ignore` and `Disconnect` are unused until Task 3's failure-path tests.
#[allow(dead_code)]
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
