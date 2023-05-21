use super::{network::Network, Networks, Result};
use crate::types::GlobalState;

#[tauri::command]
pub async fn networks_get_current() -> Result<Network> {
    let networks = Networks::read().await;

    Ok(networks.get_current_network().clone())
}

#[tauri::command]
pub async fn networks_get_list() -> Result<Vec<Network>> {
    let networks = Networks::read().await;

    Ok(networks.networks.values().cloned().collect())
}

#[tauri::command]
pub async fn networks_set_current(network: String) -> Result<()> {
    let mut networks = Networks::write().await;

    networks.set_current_network(network)?;

    Ok(())
}

#[tauri::command]
pub async fn networks_set_list(new_networks: Vec<Network>) -> Result<()> {
    let mut networks = Networks::write().await;

    networks.set_networks(new_networks);

    Ok(())
}

#[tauri::command]
pub async fn networks_reset() -> Result<Vec<Network>> {
    let mut networks = Networks::write().await;

    networks.reset_networks();

    Ok(networks.networks.values().cloned().collect())
}
