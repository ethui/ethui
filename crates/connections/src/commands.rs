use ethui_networks::{NetworksActorExt as _, networks};
use ethui_types::{Affinity, prelude::*};

use crate::Store;

#[tauri::command]
pub async fn connections_affinity_for(domain: String) -> Affinity {
    Store::read().await.get_affinity(&domain)
}

#[tauri::command]
pub async fn connections_set_affinity(domain: &str, affinity: Affinity) -> TauriResult<()> {
    let networks = networks();
    let id = match affinity {
        Affinity::Sticky(id) => {
            let chain_id = id.chain_id();

            if !networks.validate_chain_id(chain_id).await? {
                return Err(eyre!("Invalid chain ID {chain_id}").into());
            }

            id
        }
        _ => networks.get_current().await?.id(),
    };

    Store::write().await.set_affinity(domain, affinity)?;
    ethui_broadcast::chain_changed(id, Some(domain.into()), affinity).await;

    Ok(())
}
