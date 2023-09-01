#[tauri::command]
pub async fn alchemy_supported_network(chain_id: u32) -> bool {
    iron_sync_alchemy::supports_network(chain_id)
}
