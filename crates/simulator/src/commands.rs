use iron_db::Db;
use iron_networks::Networks;
use iron_types::{Address, GlobalState};

use crate::{
    errors::SimulationResult,
    evm::Evm,
    types::{Request, Result},
};

#[tauri::command]
pub async fn simulator_run(chain_id: u32, request: Request) -> SimulationResult<Result> {
    let network = Networks::read().await.get_network(chain_id).unwrap();

    let mut evm = Evm::new(network.http_url, None, request.gas_limit).await;

    evm.call(request).await
}

#[tauri::command]
pub async fn simulator_get_call_count(
    chain_id: u32,
    to: Address,
    db: tauri::State<'_, Db>,
) -> SimulationResult<u32> {
    let addrs = iron_wallets::Wallets::read()
        .await
        .get_all_addresses()
        .await;

    let mut res = 0;
    for (_, from) in addrs {
        res += db.get_call_count(chain_id, from, to).await.unwrap();
    }

    Ok(res)
}
