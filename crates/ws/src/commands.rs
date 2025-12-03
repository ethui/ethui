use std::collections::HashMap;

use common::GlobalState;

use crate::{Peer, Peers};

#[tauri::command]
pub async fn ws_peers_by_domain() -> HashMap<String, Vec<Peer>> {
    Peers::read().await.by_domain()
}

#[tauri::command]
pub async fn ws_peer_count() -> usize {
    Peers::read().await.count()
}
