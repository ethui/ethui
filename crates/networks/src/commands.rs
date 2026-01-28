use ethui_types::{NewNetworkParams, prelude::*};

use crate::actor::{NetworksActorExt as _, networks};

#[tauri::command]
pub async fn networks_get_current() -> TauriResult<Network> {
    Ok(networks().get_current().await?)
}

#[tauri::command]
pub async fn networks_get_list() -> TauriResult<Vec<Network>> {
    Ok(networks().get_list().await?)
}

#[tauri::command]
pub async fn networks_set_current(name: String) -> TauriResult<Network> {
    let networks = networks();
    networks.set_current(name).await?;
    Ok(networks.get_current().await?)
}

#[tauri::command]
pub async fn networks_add(network: NewNetworkParams) -> TauriResult<()> {
    Ok(networks().add(network).await?)
}

#[tauri::command]
pub async fn networks_update(old_name: String, network: Network) -> TauriResult<()> {
    Ok(networks().update(old_name, network).await?)
}

#[tauri::command]
pub async fn networks_remove(name: String) -> TauriResult<()> {
    Ok(networks().remove(name).await?)
}

#[tauri::command]
pub async fn networks_is_dev(id: NetworkId) -> TauriResult<bool> {
    let network = networks()
        .get(id)
        .await?
        .with_context(|| "Network not found")?;

    Ok(network.is_dev().await)
}

#[tauri::command]
pub async fn networks_chain_id_from_provider(url: String) -> TauriResult<u64> {
    use alloy::providers::{Provider, ProviderBuilder};

    let provider = ProviderBuilder::new()
        .disable_recommended_fillers()
        .connect(&url)
        .await
        .with_context(|| format!("Failed to connect to provider at {url}"))?;

    Ok(provider
        .get_chain_id()
        .await
        .with_context(|| format!("Failed to get chain ID from provider at {url}"))?)
}
