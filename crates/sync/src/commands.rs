#[tauri::command]
pub async fn sync_alchemy_supported_network(chain_id: u32) -> bool {
    iron_sync_alchemy::supports_network(chain_id)
}
