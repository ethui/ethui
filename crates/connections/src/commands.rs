use ethui_networks::Networks;
use ethui_types::prelude::*;

use crate::Store;

#[tauri::command]
pub async fn connections_affinity_for(domain: String) -> Affinity {
    Store::read().await.get_affinity(&domain)
}

#[tauri::command]
pub async fn connections_set_affinity(domain: &str, affinity: Affinity) -> TauriResult<()> {
    let dedup_chain_id = match affinity {
        Affinity::Sticky(dedup_chain_id) => {
            let chain_id = dedup_chain_id.chain_id();

            if !Networks::read().await.validate_chain_id(chain_id) {
                return Err(eyre!("Invalid chain ID {chain_id}").into());
            }

            dedup_chain_id
        }
        _ => Networks::read().await.get_current().dedup_chain_id(),
    };

    Store::write().await.set_affinity(domain, affinity)?;
    ethui_broadcast::chain_changed(dedup_chain_id, Some(domain.into()), affinity).await;

    Ok(())
}
