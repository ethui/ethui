use color_eyre::eyre::eyre;
use ethui_types::{CommandResult, DedupChainId, GlobalState, Network, NewNetworkParams};

use super::Networks;

#[tauri::command]
pub async fn networks_get_current() -> Network {
    let networks = Networks::read().await;

    networks.get_current().clone()
}

#[tauri::command]
pub async fn networks_get_list() -> Vec<Network> {
    let networks = Networks::read().await;

    networks.inner.networks.values().cloned().collect()
}

#[tauri::command]
pub async fn networks_set_current(network: String) -> CommandResult<Network> {
    let mut networks = Networks::write().await;

    networks
        .set_current_by_name(network)
        .await
        .map_err(|e| eyre!(e.to_string()))?;

    Ok(networks.get_current().clone())
}

#[tauri::command]
pub async fn networks_add(network: NewNetworkParams) -> CommandResult<()> {
    let mut networks = Networks::write().await;
    networks.add_network(network).await?;
    Ok(())
}

#[tauri::command]
pub async fn networks_update(old_name: String, network: Network) -> CommandResult<()> {
    let mut networks = Networks::write().await;
    networks.update_network(&old_name, network).await?;
    Ok(())
}

#[tauri::command]
pub async fn networks_remove(name: String) -> CommandResult<()> {
    let mut networks = Networks::write().await;
    networks.remove_network(&name).await?;
    Ok(())
}

#[tauri::command]
pub async fn networks_is_dev(dedup_chain_id: DedupChainId) -> CommandResult<bool> {
    let networks = Networks::read().await;

    let network = networks
        .get_network_by_dedup_chain_id(dedup_chain_id)
        .ok_or_else(|| eyre!("network does not exist"))?;

    Ok(network.is_dev().await)
}

#[tauri::command]
pub async fn networks_chain_id_from_provider(url: String) -> CommandResult<u64> {
    let networks = Networks::read().await;

    Ok(networks.chain_id_from_provider(url).await?)
}
