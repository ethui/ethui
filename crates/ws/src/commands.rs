use std::collections::HashMap;

use iron_types::GlobalState;

use crate::{Peer, Peers};

#[tauri::command]
pub async fn ws_peers_by_domain() -> HashMap<String, Vec<Peer>> {
    Peers::read().await.all_by_domain()
}

#[tauri::command]
pub async fn ws_peers_count() -> usize {
    Peers::read().await.count()
}
