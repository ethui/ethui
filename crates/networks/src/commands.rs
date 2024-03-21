use ethui_types::GlobalState;

use super::{network::Network, Networks, Result};

#[tauri::command]
pub async fn networks_get_current() -> Result<Network> {
    let networks = Networks::read().await;

    Ok(networks.get_current().clone())
}

#[tauri::command]
pub async fn networks_get_list() -> Result<Vec<Network>> {
    let networks = Networks::read().await;

    Ok(networks.networks.values().cloned().collect())
}

#[tauri::command]
pub async fn networks_set_current(network: String) -> Result<Network> {
    let mut networks = Networks::write().await;

    networks.set_current_by_name(network).await?;

    Ok(networks.get_current().clone())
}

#[tauri::command]
pub async fn networks_set_list(new_networks: Vec<Network>) -> Result<Vec<Network>> {
    let mut networks = Networks::write().await;

    networks.set_networks(new_networks).await?;

    Ok(networks.networks.values().cloned().collect())
}

#[tauri::command]
pub async fn networks_reset() -> Result<Vec<Network>> {
    let mut networks = Networks::write().await;

    networks.reset_networks().await?;

    Ok(networks.networks.values().cloned().collect())
}
