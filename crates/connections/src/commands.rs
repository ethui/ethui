use iron_networks::Networks;
use iron_types::{Affinity, GlobalState};

use crate::{Error, Result, Store};

#[tauri::command]
pub async fn connections_affinity_for(domain: String) -> Affinity {
    Store::read().await.get_affinity(&domain)
}

#[tauri::command]
pub async fn connections_set_affinity(domain: &str, affinity: Affinity) -> Result<()> {
    let new_chain_id = match affinity {
        Affinity::Sticky(chain_id) => {
            if !Networks::read().await.validate_chain_id(chain_id) {
                return Err(Error::InvalidChainId(chain_id));
            }
            chain_id
        }
        _ => Networks::read().await.get_current().chain_id,
    };

    Store::write().await.set_affinity(domain, affinity)?;
    iron_broadcast::chain_changed(new_chain_id, Some(domain.into()), affinity).await;

    Ok(())
}
