use crate::{
    errors::SimulationResult,
    evm::Evm,
    simulation::{Request, Result},
};

#[tauri::command]
pub async fn simulator_run(request: Request) -> SimulationResult<Result> {
    let fork_url = config
        .fork_url
        .unwrap_or(chain_id_to_fork_url(request.chain_id)?);

    let mut evm = Evm::new(None, fork_url, request.block_number, request.gas_limit);

    let response = evm.run(request, false).await?;
}
