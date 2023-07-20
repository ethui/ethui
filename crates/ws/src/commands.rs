use iron_types::GlobalState;

use crate::{Peer, Peers};

#[tauri::command]
pub async fn ws_get_all_peers() -> Result<Vec<Peer>, String> {
    Ok(Peers::read().await.get_all())
}
