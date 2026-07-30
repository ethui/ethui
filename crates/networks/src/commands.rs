use ethui_types::{AnvilSnapshot, AnvilSnapshotsState, NewNetworkParams, prelude::*};

use crate::actor::{NetworksActorExt as _, networks};

fn anvil_state(network: &Network) -> AnvilSnapshotsState {
    AnvilSnapshotsState {
        snapshots: network.anvil_snapshots.clone(),
        current: network.current_snapshot,
    }
}

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

    Ok(network.is_dev().await?)
}

#[tauri::command]
pub async fn networks_anvil_snapshot(id: NetworkId) -> TauriResult<AnvilSnapshotsState> {
    let mut network = networks()
        .get(id)
        .await?
        .with_context(|| "Network not found")?;

    let snapshot_id = network.anvil_snapshot().await?;
    let taken_at = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64;

    network.anvil_snapshots.push(AnvilSnapshot {
        id: snapshot_id,
        taken_at,
    });
    network.current_snapshot = Some(snapshot_id);

    let name = network.name.clone();
    let result = anvil_state(&network);
    networks().update(name, network).await?;

    Ok(result)
}

#[tauri::command]
pub async fn networks_anvil_revert(
    id: NetworkId,
    snapshot_id: U256,
) -> TauriResult<AnvilSnapshotsState> {
    let mut network = networks()
        .get(id)
        .await?
        .with_context(|| "Network not found")?;

    let reverted = network.anvil_revert(snapshot_id).await?;
    if !reverted {
        return Ok(anvil_state(&network));
    }

    // anvil consumes the reverted snapshot and invalidates any taken after it
    if let Some(pos) = network
        .anvil_snapshots
        .iter()
        .position(|s| s.id == snapshot_id)
    {
        network.anvil_snapshots.truncate(pos);
    }
    network.current_snapshot = None;

    let name = network.name.clone();
    let result = anvil_state(&network);
    networks().update(name, network).await?;

    Ok(result)
}

#[tauri::command]
pub async fn networks_anvil_delete_snapshot(
    id: NetworkId,
    snapshot_id: U256,
) -> TauriResult<AnvilSnapshotsState> {
    let mut network = networks()
        .get(id)
        .await?
        .with_context(|| "Network not found")?;

    network.anvil_snapshots.retain(|s| s.id != snapshot_id);
    if network.current_snapshot == Some(snapshot_id) {
        network.current_snapshot = None;
    }

    let name = network.name.clone();
    let result = anvil_state(&network);
    networks().update(name, network).await?;

    Ok(result)
}

#[tauri::command]
pub async fn networks_anvil_reset(id: NetworkId) -> TauriResult<AnvilSnapshotsState> {
    let mut network = networks()
        .get(id)
        .await?
        .with_context(|| "Network not found")?;

    network.anvil_reset().await?;
    network.anvil_snapshots.clear();
    network.current_snapshot = None;

    let name = network.name.clone();
    let result = anvil_state(&network);
    networks().update(name, network).await?;

    Ok(result)
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
