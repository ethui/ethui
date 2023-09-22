#[tauri::command]
pub async fn sync_alchemy_is_network_supported(chain_id: u32) -> bool {
    iron_sync_alchemy::supports_network(chain_id)
}
