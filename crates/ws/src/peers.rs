use std::{collections::HashMap, net::SocketAddr};

use iron_networks::Networks;
use iron_rpc::RpcStore;
use iron_types::{Affinity, ChecksummedAddress, GlobalState, UINotify};
use serde::Serialize;
use serde_json::json;
use tokio::sync::{mpsc, RwLockReadGuard};

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

    /// Extracts the domain from the url
    pub fn domain(&self) -> Option<String> {
        self.url.as_ref().and_then(|url| {
            url.parse::<url::Url>()
                .ok()
                .and_then(|url| url.host_str().map(|s| s.to_owned()))
        })
    }
}

impl From<Peer> for iron_rpc::Handler {
    fn from(value: Peer) -> Self {
        Self::new(value.domain())
    }
}

/// Tracks a list of peers, usually browser tabs, that connect to the app
#[derive(Debug, Default)]
pub struct Peers {
    // current list of connections
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
    pub async fn broadcast_chain_changed(
        &self,
        chain_id: u32,
        domain: Option<String>,
        affinity: Affinity,
    ) {
        if let Some(network) = Networks::read().await.get_network(chain_id) {
            let msg = json!({
                "method": "chainChanged",
                "params": {
                    "chainId": format!("0x{:x}", chain_id),
                    "networkVersion": network.name
                }
            });

            let store = iron_rpc::RpcStore::read().await;
            for (_, peer) in self.map.iter() {
                if affinity_matches(peer, &domain, &affinity, &store) {
                    tracing::info!(
                        event = "peer chain changed",
                        domain = peer.domain(),
                        chain_id
                    );
                    peer.sender
                        .send(serde_json::to_value(&msg).unwrap())
                        .unwrap_or_else(|e| {
                            tracing::warn!("Failed to send message to peer: {}", e);
                        });
                }
            }
        }
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

// checks if a peer matches the given affinity
fn affinity_matches(
    peer: &Peer,
    domain: &Option<String>,
    affinity: &Affinity,
    store: &RwLockReadGuard<'_, RpcStore>,
) -> bool {
    use Affinity::*;

    match affinity {
        // if affinity is global/undefined, we match against any other global/undefined peer
        Unset | Global => {
            let current_affinity = peer.domain().map(|d| store.get_affinity(&d));

            current_affinity
                .map(|a| a.is_unset() || a.is_global())
                .unwrap_or(true)
        }

        // if affinity is sticky, we only match against peers on the same domain
        Sticky(_) => peer.domain() == *domain,
    }
}
