use std::{collections::HashMap, net::SocketAddr};

use futures_util::lock::{Mutex, MutexGuard};
use log::warn;
use once_cell::sync::Lazy;
use serde::Serialize;
use serde_json::json;
use tokio::sync::mpsc;

use super::wallet::ChecksummedAddress;
use crate::{app, ws::Peer};

#[derive(Default)]
pub struct Peers {
    map: HashMap<SocketAddr, Peer>,
    window_snd: Option<mpsc::UnboundedSender<app::Event>>,
}

static PEERS: Lazy<Mutex<Peers>> = Lazy::new(Default::default);

impl Peers {
    pub async fn get<'a>() -> MutexGuard<'a, Peers> {
        PEERS.lock().await
    }

    pub async fn init(sender: mpsc::UnboundedSender<app::Event>) {
        let mut peers = PEERS.lock().await;
        peers.window_snd = Some(sender);
    }

    pub fn add_peer(&mut self, peer: Peer) {
        self.map.insert(peer.socket, peer);
        self.window_snd
            .as_ref()
            .unwrap()
            .send(app::Notify::ConnectionsUpdated.into())
            .unwrap();
    }

    pub fn remove_peer(&mut self, peer: SocketAddr) {
        self.map.remove(&peer);
        self.window_snd
            .as_ref()
            .unwrap()
            .send(app::Notify::ConnectionsUpdated.into())
            .unwrap();
    }

    pub fn broadcast_accounts_changed(&self, new_accounts: Vec<ChecksummedAddress>) {
        self.broadcast(json!({
            "method": "accountsChanged",
            "params": new_accounts
        }));
    }

    pub fn broadcast_chain_changed(&self, chain_id: u32, name: String) {
        self.broadcast(json!({
            "method": "chainChanged",
            "params": {
                "chainId": format!("0x{:x}", chain_id),
                "networkVersion": name
            }
        }));
    }

    fn broadcast<T: Serialize + std::fmt::Debug>(&self, msg: T) {
        self.map.iter().for_each(|(_, peer)| {
            peer.sender
                .send(serde_json::to_value(&msg).unwrap())
                .unwrap_or_else(|e| {
                    warn!("Failed to send message to peer: {}", e);
                });
        });
    }

    fn get_all(&self) -> Vec<Peer> {
        self.map.values().cloned().collect()
    }
}

#[tauri::command]
pub async fn peers_get_all() -> Result<Vec<Peer>, String> {
    Ok(Peers::get().await.get_all())
}
