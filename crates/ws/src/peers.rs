use std::net::SocketAddr;

use ethui_networks::{NetworksActorExt as _, networks};
use ethui_types::{Affinity, NetworkId, prelude::*};
use serde_json::json;
use tokio::sync::mpsc;

#[derive(Clone, Debug, Serialize)]
pub struct Peer {
    pub origin: String,
    pub url: Option<String>,
    pub socket: SocketAddr,
    #[serde(skip)]
    pub sender: mpsc::UnboundedSender<serde_json::Value>,

    // non-alive peers can represent browser tabs with now web3 connection
    pub alive: bool,
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

        Self {
            alive: false,
            socket,
            sender,
            origin,
            url,
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

impl From<Peer> for ethui_rpc::Handler {
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
        ethui_broadcast::peer_added().await;
        ethui_broadcast::ui_notify(UINotify::PeersUpdated).await;
    }

    /// Removes an existing peer
    pub async fn remove_peer(&mut self, peer: SocketAddr) {
        self.map.remove(&peer);
        ethui_broadcast::ui_notify(UINotify::PeersUpdated).await;
    }

    pub async fn peer_alive(&mut self, peer: Peer) {
        self.map.get_mut(&peer.socket).unwrap().alive = true;
        ethui_broadcast::ui_notify(UINotify::PeersUpdated).await;
    }

    /// Broadcasts an `accountsChanged` event to all peers
    pub fn broadcast_accounts_changed(&self, new_accounts: Vec<Address>) {
        self.broadcast(json!({
            "method": "accountsChanged",
            "params": new_accounts
        }));
    }

    /// Broadcasts a `chainChanged` event to all peers
    pub async fn broadcast_chain_changed(
        &self,
        id: NetworkId,
        domain: Option<String>,
        affinity: Affinity,
    ) {
        let chain_id = id.chain_id();

        let is_valid = networks()
            .validate_chain_id(chain_id)
            .await
            .expect("networks actor not available");

        if is_valid {
            let msg = json!({
                "method": "chainChanged",
                "params": {
                    "chainId": format!("0x{:x}", chain_id),
                }
            });

            for (_, peer) in self.map.iter() {
                if ethui_connections::utils::affinity_matches(peer.domain(), &domain, affinity)
                    .await
                {
                    tracing::info!(
                        event = "peer chain changed",
                        domain = peer.domain(),
                        chain_id,
                        dedup_id = id.dedup_id(),
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

    pub(crate) fn by_domain(&self) -> HashMap<String, Vec<Peer>> {
        self.map.values().fold(Default::default(), |mut acc, p| {
            if !p.alive {
                return acc;
            }

            acc.entry(p.domain().unwrap_or_default())
                .or_default()
                .push(p.clone());
            acc
        })
    }

    pub fn count(&self) -> usize {
        self.map.len()
    }
}
