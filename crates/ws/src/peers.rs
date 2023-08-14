use std::{collections::HashMap, net::SocketAddr, path::PathBuf};

use iron_types::{ChecksummedAddress, UINotify};
use serde::{Deserialize, Serialize};
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

    store: Store,
    file: PathBuf,
}

#[derive(Debug, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub(crate) struct Store {
    // maps rule -> current_chain_id
    // rule is currently a domain, but may eventually grow
    // TODO: removing networks will cause some affinities to become invalid. need to clean them up
    affinities: HashMap<String, u64>,
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

    pub async fn set_affinity(&mut self, domain: String, chain_id: u32)->Result<()>{        }
        self.store.affinities.insert(domain, chain_id as u64);
        self.save().await?;

    Ok()
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
