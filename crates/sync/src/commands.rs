use db::Db;
use common::{Address, TauriResult, U256};

#[tauri::command]
pub async fn sync_alchemy_is_network_supported(chain_id: u32) -> bool {
    sync_alchemy::supports_network(chain_id)
}

#[tauri::command]
pub async fn sync_get_native_balance(
    chain_id: u32,
    address: Address,
    db: tauri::State<'_, Db>,
) -> TauriResult<U256> {
    async fn inner(
        chain_id: u32,
        address: Address,
        db: tauri::State<'_, Db>,
    ) -> color_eyre::Result<U256> {
        let network = networks::get_network(chain_id).await?;

        // TODO: check with networks if this is anvil or not
        if network.is_dev().await {
            Ok(sync_anvil::get_native_balance(network.http_url.to_string(), address).await?)
        } else {
            Ok(db.get_native_balance(chain_id, address).await)
        }
    }

    Ok(inner(chain_id, address, db).await?)
}
