use crate::utils::safe_supports_network;

#[tauri::command]
pub async fn safe_is_network_supported(chain_id: u32) -> bool {
    safe_supports_network(chain_id)
}
