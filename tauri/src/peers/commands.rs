use super::Peers;
use crate::{global_state::GlobalState, ws::Peer};

#[tauri::command]
pub async fn peers_get_all() -> Result<Vec<Peer>, String> {
    Ok(Peers::read().await.get_all())
}
