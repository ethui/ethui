use ethui_types::{NewNetworkParams, prelude::*};

use crate::{
    AddNetwork, ChainIdFromProvider, GetCurrent, GetList, IsDev, RemoveNetwork, SetCurrentByName,
    UpdateNetwork, ask,
};

#[tauri::command]
pub async fn networks_get_current() -> TauriResult<Network> {
    Ok(ask(GetCurrent).await?)
}

#[tauri::command]
pub async fn networks_get_list() -> TauriResult<Vec<Network>> {
    Ok(ask(GetList).await?)
}

#[tauri::command]
pub async fn networks_set_current(network: String) -> TauriResult<Network> {
    Ok(ask(SetCurrentByName(network)).await?)
}

#[tauri::command]
pub async fn networks_add(network: NewNetworkParams) -> TauriResult<()> {
    ask(AddNetwork(network)).await?;
    Ok(())
}

#[tauri::command]
pub async fn networks_update(old_name: String, network: Network) -> TauriResult<()> {
    ask(UpdateNetwork(old_name, network)).await?;
    Ok(())
}

#[tauri::command]
pub async fn networks_remove(name: String) -> TauriResult<()> {
    ask(RemoveNetwork(name)).await?;
    Ok(())
}

#[tauri::command]
pub async fn networks_is_dev(id: NetworkId) -> TauriResult<bool> {
    Ok(ask(IsDev(id)).await?)
}

#[tauri::command]
pub async fn networks_chain_id_from_provider(url: String) -> TauriResult<u64> {
    Ok(ask(ChainIdFromProvider(url)).await?)
}
