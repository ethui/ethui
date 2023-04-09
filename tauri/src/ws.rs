use std::collections::HashMap;
use std::net::SocketAddr;

use futures_util::{SinkExt, StreamExt};
use log::*;
use serde::Serialize;
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::mpsc;
use tokio_tungstenite::accept_hdr_async;
use tungstenite::handshake::server::{ErrorResponse, Request, Response};
use url::Url;

use crate::context::Context;
use crate::error::{Error, Result};
use crate::rpc::Handler;

#[derive(Clone, Debug, Serialize)]
pub struct Peer {
    pub origin: String,
    pub favicon: Option<String>,
    pub url: Option<String>,
    pub tab_id: Option<u32>,
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

        Self {
            socket,
            sender,
            origin,
            favicon,
            url,
            tab_id,
        }
    }
}

pub async fn ws_server_loop(ctx: Context) {
    let addr = "127.0.0.1:9002";
    let listener = TcpListener::bind(&addr).await.expect("Can't listen to");

    while let Ok((stream, _)) = listener.accept().await {
        let peer = stream
            .peer_addr()
            .expect("connected streams should have a peer address");
        debug!("Peer address: {}", peer);

        tokio::spawn(accept_connection(peer, stream, ctx.clone()));
    }
}

pub async fn accept_connection(peer: SocketAddr, stream: TcpStream, ctx: Context) {
    let err = handle_connection(peer, stream, ctx).await;

    if let Err(e) = err {
        match e {
            Error::Websocket(e) => match e {
                tungstenite::Error::ConnectionClosed
                | tungstenite::Error::Protocol(_)
                | tungstenite::Error::Utf8 => {
                    info!("Connection closed, {:?}", peer);
                }
                _ => (),
            },
            _ => {
                error!("JSON error {:?}, connection terminated {:?}", e, peer)
            }
        }
    }
}

async fn handle_connection(socket: SocketAddr, stream: TcpStream, ctx: Context) -> Result<()> {
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

    let (mut ws_sender, mut ws_receiver) = ws_stream.split();
    let (snd, mut rcv) = mpsc::unbounded_channel::<serde_json::Value>();

    let peer = Peer::new(socket, snd, query_params);
    debug!("New Peer connection: {:?}", peer);
    ctx.lock().await.add_peer(peer);
    let handler = Handler::default();

    loop {
        tokio::select! {
            // RPC request
            msg = ws_receiver.next() =>{
                match msg {
                    Some(msg)=>{
                        let msg = msg?;
                        let reply = handler.handle(msg.to_string(), ctx.clone()).await;
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

        }
    }

    ctx.lock().await.remove_peer(socket);

    Ok(())
}
