use std::{collections::HashMap, net::SocketAddr};

use iron_types::{ChecksummedAddress, UINotify};
use serde::Serialize;
use serde_json::json;
use tokio::sync::mpsc;

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
    pub fn new(
        socket: SocketAddr,
        sender: mpsc::UnboundedSender<serde_json::Value>,
        params: &HashMap<String, String>,
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

/// Tracks a list of peers, usually browser tabs, that connect to the app
#[derive(Debug, Default)]
pub struct Peers {
    map: HashMap<SocketAddr, Peer>,
}

impl Peers {
    /// Adds a new peer
    pub async fn add_peer(&mut self, peer: Peer) {
        self.map.insert(peer.socket, peer);
        iron_broadcast::ui_notify(UINotify::PeersUpdated).await;
        //self.window_snd.send(UINotify::PeersUpdated.into()).unwrap();
    }

    /// Removes an existing peer
    pub async fn remove_peer(&mut self, peer: SocketAddr) {
        self.map.remove(&peer);
        iron_broadcast::ui_notify(UINotify::PeersUpdated).await;
        //self.window_snd.send(UINotify::PeersUpdated.into()).unwrap();
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
                    tracing::warn!("Failed to send message to peer: {}", e);
                });
        });
    }

    pub(crate) fn get_all(&self) -> Vec<Peer> {
        self.map.values().cloned().collect()
    }
}
