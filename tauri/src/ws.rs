use std::net::SocketAddr;

use futures_util::{SinkExt, StreamExt};
use log::*;
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::mpsc;
use tokio_tungstenite::accept_async;
use tungstenite::Message;

use crate::context::Context;
use crate::error::{Error, Result};
use crate::rpc::Handler;

pub async fn ws_server_loop(ctx: Context) {
    let addr = "127.0.0.1:9002";
    let listener = TcpListener::bind(&addr).await.expect("Can't listen to");

    while let Ok((stream, _)) = listener.accept().await {
        let peer = stream
            .peer_addr()
            .expect("connected streams should have a peer address");

        tokio::spawn(accept_connection(peer, stream, ctx.clone()));
    }
}

pub async fn accept_connection(peer: SocketAddr, stream: TcpStream, ctx: Context) {
    let err = handle_connection(peer, stream, ctx.clone()).await;

    // TODO: this removal should be cleaner
    debug!("Peer down: {}", peer);
    ctx.lock().await.remove_peer(peer);

    if let Err(e) = err {
        match e {
            Error::Websocket(e) => match e {
                tungstenite::Error::ConnectionClosed
                | tungstenite::Error::Protocol(_)
                | tungstenite::Error::Utf8 => {
                    info!("Connection closed, {:?}, {:?}", peer, e);
                }
                _ => (),
            },
            _ => {
                error!("JSON error {:?}, connection terminated {:?}", e, peer)
            }
        }
    }
}

async fn handle_connection(peer: SocketAddr, stream: TcpStream, ctx: Context) -> Result<()> {
    debug!("Peer   up: {}", peer);

    let ws_stream = accept_async(stream).await.expect("Failed to accept");
    let (mut ws_sender, mut ws_receiver) = ws_stream.split();
    let (snd, mut rcv) = mpsc::unbounded_channel::<serde_json::Value>();

    ctx.lock().await.add_peer(peer, snd);
    let handler = Handler::default();
    let mut interval = tokio::time::interval(std::time::Duration::from_secs(15));

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

            // send a ping every 15 seconds
            _ = interval.tick() => {
                ws_sender.send(Message::Ping(Default::default())).await?;
            }

        }
    }

    debug!("Peer down: {}", peer);
    ctx.lock().await.remove_peer(peer);

    Ok(())
}
