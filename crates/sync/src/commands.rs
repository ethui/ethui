use iron_db::DB;
use iron_networks::Networks;
use iron_types::{Address, GlobalState, U256};

use crate::{Error, Result};

#[tauri::command]
pub async fn sync_alchemy_is_network_supported(chain_id: u32) -> bool {
    iron_sync_alchemy::supports_network(chain_id)
}

#[tauri::command]
pub async fn sync_get_native_balance(
    chain_id: u32,
    address: Address,
    db: tauri::State<'_, DB>,
) -> Result<U256> {
    let network = Networks::read()
        .await
        .get_network(chain_id)
        .ok_or(Error::InvalidNetwork(chain_id))?;

    // TODO: check with networks if this is anvil or not
    if network.is_dev() {
        Ok(iron_sync_anvil::get_native_balance(network.http_url, address).await?)
    } else {
        Ok(db.get_native_balance(chain_id, address).await)
    }
}
