use ethui_types::{NewNetworkParams, prelude::*};

use crate::actor::{networks, NetworksActorExt as _};

#[tauri::command]
pub async fn networks_get_current() -> TauriResult<Network> {
    Ok(networks().get_current().await?)
}

#[tauri::command]
pub async fn networks_get_list() -> TauriResult<Vec<Network>> {
    Ok(networks().get_list().await?)
}

#[tauri::command]
pub async fn networks_set_current(network: String) -> TauriResult<Network> {
    let actor = networks();

    actor
        .set_current_by_name(network)
        .await
        .map_err(SerializableError::from)?;

    Ok(actor.get_current().await?)
}

#[tauri::command]
pub async fn networks_add(network: NewNetworkParams) -> TauriResult<()> {
    networks()
        .add_network(network)
        .await
        .map_err(SerializableError::from)?;
    Ok(())
}

#[tauri::command]
pub async fn networks_update(old_name: String, network: Network) -> TauriResult<()> {
    networks()
        .update_network(old_name, network)
        .await
        .map_err(SerializableError::from)?;
    Ok(())
}

#[tauri::command]
pub async fn networks_remove(name: String) -> TauriResult<()> {
    networks()
        .remove_network(name)
        .await
        .map_err(SerializableError::from)?;
    Ok(())
}

#[tauri::command]
pub async fn networks_is_dev(id: NetworkId) -> TauriResult<bool> {
    let network = networks()
        .get_network_by_dedup_chain_id(id)
        .await?
        .ok_or_else(|| SerializableError::from(eyre!("Network not found")))?;

    Ok(network.is_dev().await)
}

#[tauri::command]
pub async fn networks_chain_id_from_provider(url: String) -> TauriResult<u64> {
    use alloy::providers::{Provider, ProviderBuilder};

    let provider = ProviderBuilder::new()
        .disable_recommended_fillers()
        .connect(&url)
        .await
        .with_context(|| format!("Failed to connect to provider at {url}"))
        .map_err(SerializableError::from)?;

    provider
        .get_chain_id()
        .await
        .with_context(|| format!("Failed to get chain ID from provider at {url}"))
        .map_err(SerializableError::from)
}
