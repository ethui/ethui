use ethui_types::{NewNetworkParams, prelude::*};

use super::Networks;

#[tauri::command]
pub async fn networks_get_current() -> TauriResult<Network> {
    let networks = Networks::read().await;

    Ok(networks.get_current().clone())
}

#[tauri::command]
pub async fn networks_get_list() -> TauriResult<Vec<Network>> {
    let networks = Networks::read().await;

    Ok(networks.inner.networks.values().cloned().collect())
}

#[tauri::command]
pub async fn networks_set_current(network: String) -> TauriResult<Network> {
    let mut networks = Networks::write().await;

    networks
        .set_current_by_name(network)
        .await
        .map_err(SerializableError::from)?;

    Ok(networks.get_current().clone())
}

#[tauri::command]
pub async fn networks_add(network: NewNetworkParams) -> TauriResult<()> {
    let mut networks = Networks::write().await;
    networks
        .add_network(network)
        .await
        .map_err(SerializableError::from)?;
    Ok(())
}

#[tauri::command]
pub async fn networks_update(old_name: String, network: Network) -> TauriResult<()> {
    let mut networks = Networks::write().await;
    networks
        .update_network(&old_name, network)
        .await
        .map_err(SerializableError::from)?;
    Ok(())
}

#[tauri::command]
pub async fn networks_remove(name: String) -> TauriResult<()> {
    let mut networks = Networks::write().await;
    networks
        .remove_network(&name)
        .await
        .map_err(SerializableError::from)?;
    Ok(())
}

#[tauri::command]
pub async fn networks_is_dev(id: NetworkId) -> TauriResult<bool> {
    let networks = Networks::read().await;

    let network = networks
        .get_network_by_dedup_chain_id(id)
        .with_context(|| "Does not exist".to_string())
        .map_err(SerializableError::from)?;

    Ok(network.is_dev().await)
}

#[tauri::command]
pub async fn networks_chain_id_from_provider(url: String) -> TauriResult<u64> {
    let networks = Networks::read().await;

    networks
        .chain_id_from_provider(url)
        .await
        .map_err(SerializableError::from)
}
