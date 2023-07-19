use iron_types::GlobalState;

use super::Peers;
use crate::Peer;

#[tauri::command]
pub async fn peers_get_all() -> Result<Vec<Peer>, String> {
    Ok(Peers::read().await.get_all())
}
