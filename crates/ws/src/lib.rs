mod error;
pub mod peers;

use std::{collections::HashMap, net::SocketAddr};

pub use error::{WsError, WsResult};
use futures_util::{SinkExt, StreamExt};
use iron_types::GlobalState;
use log::*;
use serde::Serialize;
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

use crate::{peers::Peers, rpc::Handler};

#[derive(Clone, Debug, Serialize)]
pub struct Peer {
    pub origin: String,
    pub favicon: Option<String>,
    pub url: Option<String>,
    pub tab_id: Option<u32>,
    pub title: Option<String>,
    pub socket: SocketAddr,
    #[serde(skip)]
    pub sender: mpsc::UnboundedSender<serde_json::Value>,
}

impl Peer {
    fn new(
        socket: SocketAddr,
        sender: mpsc::UnboundedSender<serde_json::Value>,
        params: HashMap<String, String>,
    ) -> Self {
        let origin = params
            .get("origin")
            .cloned()
            .unwrap_or(String::from("unknown"));

        let url = params.get("url").cloned();
        let favicon = params.get("favicon").cloned();
        let tab_id = params.get("tabId").cloned().and_then(|id| id.parse().ok());
        let title = params.get("title").cloned();

        Self {
            socket,
            sender,
            origin,
            favicon,
            url,
            tab_id,
            title,
        }
    }
}

pub async fn ws_server_loop() {
    let addr = "127.0.0.1:9002";
    let listener = TcpListener::bind(&addr).await.expect("Can't listen to");

    while let Ok((stream, _)) = listener.accept().await {
        let peer = stream
            .peer_addr()
            .expect("connected streams should have a peer address");

        tokio::spawn(accept_connection(peer, stream));
    }
}

pub async fn accept_connection(socket: SocketAddr, stream: TcpStream) {
    let mut query_params: HashMap<String, String> = Default::default();
    let callback = |req: &Request, res: Response| -> std::result::Result<Response, ErrorResponse> {
        // url = Some(req.uri().clone());
        let url = Url::parse(&format!("{}{}", "http://localhost", req.uri()));
        query_params = url.unwrap().query_pairs().into_owned().collect();
        Ok(res)
    };

    let ws_stream = accept_hdr_async(stream, callback)
        .await
        .expect("Failed to accept");
    let (snd, rcv) = mpsc::unbounded_channel::<serde_json::Value>();

    let peer = Peer::new(socket, snd, query_params);

    Peers::write().await.add_peer(peer);
    let err = handle_connection(ws_stream, rcv).await;
    Peers::write().await.remove_peer(socket);

    if let Err(e) = err {
        match e {
            WsError::Websocket(e) => match e {
                tungstenite::Error::ConnectionClosed
                | tungstenite::Error::Protocol(_)
                | tungstenite::Error::Utf8 => {
                    info!("Connection closed, {:?}, {:?}", socket, e);
                }
                _ => (),
            },
            _ => {
                error!("JSON error {:?}, connection terminated {:?}", e, socket)
            }
        }
    }
}

async fn handle_connection(
    stream: WebSocketStream<TcpStream>,
    mut rcv: mpsc::UnboundedReceiver<serde_json::Value>,
) -> WsResult<()> {
    let handler = Handler::default();
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
                        error!("unexpected error");
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
