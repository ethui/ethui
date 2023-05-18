pub mod commands;
mod global;

use std::{collections::HashMap, net::SocketAddr};

use log::warn;
use serde::Serialize;
use serde_json::json;
use tokio::sync::mpsc;

use crate::{app, types::ChecksummedAddress, ws::Peer};

/// Tracks a list of peers, usually browser tabs, that connect to the app
#[derive(Debug, Default)]
pub struct Peers {
    map: HashMap<SocketAddr, Peer>,
    window_snd: Option<mpsc::UnboundedSender<app::Event>>,
}

impl Peers {
    /// Adds a new peer
    pub fn add_peer(&mut self, peer: Peer) {
        self.map.insert(peer.socket, peer);
        self.window_snd
            .as_ref()
            .unwrap()
            .send(app::Notify::ConnectionsUpdated.into())
            .unwrap();
    }

    /// Removes an existing peer
    pub fn remove_peer(&mut self, peer: SocketAddr) {
        self.map.remove(&peer);
        self.window_snd
            .as_ref()
            .unwrap()
            .send(app::Notify::ConnectionsUpdated.into())
            .unwrap();
    }

    /// Broadcasts an `accountsChanged` event to all peers
    pub fn broadcast_accounts_changed(&self, new_accounts: Vec<ChecksummedAddress>) {
        self.broadcast(json!({
            "method": "accountsChanged",
            "params": new_accounts
        }));
    }

    /// Broadcasts a `chainChanged` event to all peers
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
