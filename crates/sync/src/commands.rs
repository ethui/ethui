use ethui_db::Db;
use ethui_types::{Address, TauriResult, U256};

#[tauri::command]
pub async fn sync_alchemy_is_network_supported(chain_id: u64) -> bool {
    ethui_sync_alchemy::supports_network(chain_id)
}

#[tauri::command]
pub async fn sync_get_native_balance(
    chain_id: u64,
    address: Address,
    db: tauri::State<'_, Db>,
) -> TauriResult<U256> {
    async fn inner(
        chain_id: u64,
        address: Address,
        db: tauri::State<'_, Db>,
    ) -> color_eyre::Result<U256> {
        let network = ethui_networks::get_network(chain_id).await?;

        // The DB is only kept current for alchemy-synced chains. For those (and
        // when not a dev node), serve the cached value. Otherwise — dev nodes, or
        // any chain nothing background-syncs (e.g. Avalanche C-Chain) — query the
        // network RPC live, or the balance would always read as 0.
        if ethui_sync_alchemy::supports_network(chain_id) && !network.is_dev().await? {
            Ok(db.get_native_balance(chain_id, address).await)
        } else {
            Ok(
                ethui_sync_devnet::get_native_balance(network.http_url.to_string(), address)
                    .await?,
            )
        }
    }

    Ok(inner(chain_id, address, db).await?)
}
