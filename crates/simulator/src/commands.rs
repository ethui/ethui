use ethui_db::Db;
use ethui_networks::Networks;
use ethui_types::{Address, GlobalState, TauriResult};

use crate::{
    evm::Evm,
    types::{Request, Result},
};

#[tauri::command]
pub async fn simulator_run(chain_id: u32, request: Request) -> TauriResult<Result> {
    let network = Networks::read()
        .await
        .get_network(chain_id)
        .cloned()
        .unwrap();

    let mut evm = Evm::new(network.http_url.to_string(), None, request.gas_limit).await?;

    Ok(evm.call(request).await?)
}

#[tauri::command]
pub async fn simulator_get_call_count(
    chain_id: u32,
    to: Address,
    db: tauri::State<'_, Db>,
) -> TauriResult<u32> {
    let addrs = ethui_wallets::Wallets::read()
        .await
        .get_all_addresses()
        .await;

    let mut res = 0;
    for (_, from) in addrs {
        res += db.get_call_count(chain_id, from, to).await.unwrap();
    }

    Ok(res)
}
