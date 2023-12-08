use iron_networks::Networks;
use iron_types::GlobalState;

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
