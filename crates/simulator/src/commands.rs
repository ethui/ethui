use ethui_db::Db;
use ethui_networks::{networks, NetworksActorExt as _};
use ethui_types::prelude::*;
use ethui_wallets::{wallets, WalletsActorExt as _};

use crate::types::{Request, SimResult};

#[tauri::command]
pub async fn simulator_run(chain_id: u32, request: Request) -> TauriResult<SimResult> {
    let network = networks()
        .get(chain_id)
        .await?
        .with_context(|| "Network not found")?;

    Ok(crate::simulate_once(request, network.http_url.to_string(), None).await?)
}

#[tauri::command]
pub async fn simulator_get_call_count(
    chain_id: u32,
    to: Address,
    db: tauri::State<'_, Db>,
) -> TauriResult<u32> {
    let addrs = wallets().get_all_addresses().await?;

    let mut res = 0;
    for (_, from) in addrs {
        res += db.get_call_count(chain_id, from, to).await.unwrap();
    }

    Ok(res)
}
