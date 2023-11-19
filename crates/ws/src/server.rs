use std::{collections::HashMap, net::SocketAddr};

use futures::{SinkExt, StreamExt};
use iron_types::GlobalState;
use tokio::{
    net::{TcpListener, TcpStream},
    sync::mpsc,
};
use tokio_tungstenite::{accept_hdr_async, WebSocketStream};
use tungstenite::{
    handshake::server::{ErrorResponse, Request, Response},
    Message,
};
use url::Url;

pub use crate::error::{WsError, WsResult};
use crate::peers::{Peer, Peers};

pub(crate) async fn server_loop(port: u16) {
    let addr = format!("127.0.0.1:{}", port);
    let listener = TcpListener::bind(&addr).await.expect("Can't listen to");

    tracing::debug!("WS server listening on: {}", addr);

    while let Ok((stream, _)) = listener.accept().await {
        let peer = stream
            .peer_addr()
            .expect("connected streams should have a peer address");

        tokio::spawn(accept_connection(peer, stream));
    }
}

async fn accept_connection(socket: SocketAddr, stream: TcpStream) {
    let mut query_params: HashMap<String, String> = Default::default();
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

    tracing::debug!("Peer  {}", url);

    let peer = Peer::new(socket, snd, &query_params);

    Peers::write().await.add_peer(peer.clone()).await;
    let err = handle_connection(peer, ws_stream, rcv).await;
    Peers::write().await.remove_peer(socket).await;

    if let Err(e) = err {
        match e {
            WsError::Websocket(e) => match e {
                tungstenite::Error::ConnectionClosed
                | tungstenite::Error::Protocol(_)
                | tungstenite::Error::Utf8 => {
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

async fn handle_connection(
    peer: Peer,
    stream: WebSocketStream<TcpStream>,
    mut rcv: mpsc::UnboundedReceiver<serde_json::Value>,
) -> WsResult<()> {
    let handler: iron_rpc::Handler = peer.into();
    let mut interval = tokio::time::interval(std::time::Duration::from_secs(15));
    let (mut ws_sender, mut ws_receiver) = stream.split();

    loop {
        tokio::select! {
            // RPC request
            msg = ws_receiver.next() =>{
                match msg {
                    Some(msg)=>{
                        let msg = msg?;
                        if let Message::Pong(_) = msg {
                            continue;
                        }
                        let reply = handler.handle(msg.to_string()).await;
                        let reply = reply.unwrap_or_else(||serde_json::Value::Null.to_string());

                        ws_sender.send(reply.into()).await?;
                    },
                    None=>break
                }
            }

            // data sent from provider, or event broadcast
            msg = rcv.recv() =>{
                match msg {
                    Some(msg)=>{
                        ws_sender.send(msg.to_string().into()).await?;
                    },
                    None=>{
                        tracing::error!("unexpected error");
                        break
                    }
                }
            }

            // send a ping every 15 seconds
            _ = interval.tick() => {
                ws_sender.send(Message::Ping(Default::default())).await?;
            }

        }
    }

    Ok(())
}
