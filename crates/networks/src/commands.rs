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
pub async fn networks_add(network: Network) -> Result<()> {
    let mut networks = Networks::write().await;
    networks.add_network(network).await?;
    Ok(())
}

#[tauri::command]
pub async fn networks_update(old_name: String, network: Network) -> Result<()> {
    let mut networks = Networks::write().await;
    networks.update_network(&old_name, network).await?;
    Ok(())
}

#[tauri::command]
pub async fn networks_remove(name: String) -> Result<()> {
    let mut networks = Networks::write().await;
    networks.remove_network(&name).await?;
    Ok(())
}

#[tauri::command]
pub async fn networks_is_dev() -> Result<bool> {
    let networks = Networks::read().await;

    Ok(networks.get_current().is_dev().await)
}
