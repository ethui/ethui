use std::{collections::HashMap, net::SocketAddr};

use ethui_types::prelude::*;
use futures::{SinkExt, StreamExt, stream::SplitSink};
use tokio::{
    net::{TcpListener, TcpStream},
    sync::mpsc,
};
use tokio_tungstenite::{
    WebSocketStream, accept_hdr_async,
    tungstenite::{
        self, Message,
        handshake::server::{ErrorResponse, Request, Response},
    },
};
use tracing::warn;
use url::Url;

pub use crate::error::{WsError, WsResult};
use crate::peers::{Peer, Peers};

#[instrument(level = "debug")]
pub(crate) async fn server(port: u16) {
    let addr = format!("127.0.0.1:{port}");
    let listener = TcpListener::bind(&addr).await.expect("Can't listen to");

    debug!("WS server listening on: {}", addr);

    while let Ok((stream, _)) = listener.accept().await {
        let peer = stream
            .peer_addr()
            .expect("connected streams should have a peer address");

        tokio::spawn(accept(peer, stream));
    }
}

async fn accept(socket: SocketAddr, stream: TcpStream) {
    let mut query_params: HashMap<String, String> = Default::default();
    // TODO: resolve this lint
    #[allow(clippy::result_large_err)]
    let callback = |req: &Request, res: Response| -> std::result::Result<Response, ErrorResponse> {
        let url = Url::parse(&format!("{}{}", "http://localhost", req.uri())).unwrap();
        query_params = url.query_pairs().into_owned().collect();
        Ok(res)
    };

    let ws_stream = accept_hdr_async(stream, callback)
        .await
        .expect("Failed to accept");
    let (snd, rcv) = mpsc::unbounded_channel::<serde_json::Value>();
    let url = query_params.get("url").cloned().unwrap_or_default();

    let peer = Peer::new(socket, snd, &query_params);

    Peers::write().await.add_peer(peer.clone()).await;
    let res = handle(peer, ws_stream, rcv).await;
    Peers::write().await.remove_peer(socket).await;

    if let Err(e) = res {
        match e {
            WsError::Websocket(e) => match e {
                tungstenite::Error::ConnectionClosed
                | tungstenite::Error::Protocol(_)
                | tungstenite::Error::Utf8(_) => {
                    tracing::debug!("Close  {} {:?}", url, e);
                }
                _ => (),
            },
            _ => {
                tracing::error!("Error {} {}", url, e);
            }
        }
    }
}

#[instrument(level = "debug", skip_all, fields(url = peer.url))]
async fn handle(
    peer: Peer,
    stream: WebSocketStream<TcpStream>,
    mut rcv: mpsc::UnboundedReceiver<serde_json::Value>,
) -> WsResult<()> {
    debug!("open");
    let handler: ethui_rpc::Handler = peer.clone().into();

    // will be used at most once to mark the peer as live once the first message comes in
    let mut liveness_checker = Some(peer);
    let mut interval = tokio::time::interval(std::time::Duration::from_secs(15));
    let (mut ws_sender, mut ws_receiver) = stream.split();

    loop {
        tokio::select! {
            // RPC request
            Some(msg) = ws_receiver.next() => {

                match msg {
                    Ok(Message::Text(msg)) => handle_message(msg.to_string(), &handler, &mut ws_sender, &mut liveness_checker).await?,
                    Ok(Message::Close(_)) => break,
                    Ok(_) => continue,
                    Err(e) => warn!("websocket error: {}", e),
                }
            }

            // data sent from provider, or event broadcast
            msg = rcv.recv() =>{
                match msg {
                    Some(msg) => {
                        ws_sender.send(msg.to_string().into()).await?;
                    },
                    None => {
                        tracing::error!("unexpected error");
                        break
                    }
                }
            }

            // send a ping every 15 seconds
            _ = interval.tick() => {
                ws_sender.send(Message::Text("ping".into())).await?;
            }
        }
    }

    debug!("close");
    Ok(())
}

async fn handle_message(
    text: String,
    handler: &ethui_rpc::Handler,
    sender: &mut SplitSink<WebSocketStream<TcpStream>, Message>,
    liveness_checker: &mut Option<Peer>,
) -> WsResult<()> {
    if text == "pong" {
        return Ok(());
    }

    if let Some(p) = liveness_checker.take() {
        Peers::write().await.peer_alive(p).await;
    }

    let reply = match serde_json::from_str(&text) {
        Ok(request) => handler
            .handle(request)
            .await
            .map(|r| {
                serde_json::to_value(&r).unwrap_or_else(|e| {
                    json_rpc_error(
                        -32603,
                        "Internal error".to_string(),
                        serde_json::Value::Null,
                    )
                })
            })
            .unwrap_or_default(),
        Err(e) => json_rpc_parse_error(e, serde_json::Value::Null),
    };

    sender.send(Message::Text(reply.to_string())).await?;
    Ok(())
}

fn json_rpc_error(code: i64, message: String, id: serde_json::Value) -> serde_json::Value {
    serde_json::json!({
        "jsonrpc": "2.0",
        "error": { "code": code, "message": message },
        "id": id,
    })
}

fn json_rpc_parse_error(error: serde_json::Error, id: serde_json::Value) -> serde_json::Value {
    let (code, message) = match error.classify() {
        serde_json::error::Category::Data => (-32600, "Invalid Request"),
        serde_json::error::Category::Syntax
        | serde_json::error::Category::Eof
        | serde_json::error::Category::Io => (-32700, "Parse error"),
    };
    json_rpc_error(code, message.to_string(), id)
}
