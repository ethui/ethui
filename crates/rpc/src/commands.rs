use ethui_types::prelude::*;

use super::{Result, methods, methods::Method, utils};

#[tauri::command]
pub async fn rpc_send_transaction(params: Json) -> Result<Json> {
    let params: methods::send_call::CallParams = serde_json::from_value(params)?;
    let (from, request) = params.into_request_with_from().await?;
    let network = utils::get_current_network().await;

    let method = methods::SendTransaction {
        network,
        from,
        request,
    };

    method.run().await
}

#[tauri::command]
pub async fn rpc_eth_call(params: Json) -> Result<Bytes> {
    let params: methods::send_call::CallParams = serde_json::from_value(params)?;
    let network = utils::get_current_network().await;

    let mut sender = methods::SendCall::new(network, params.into());

    sender.finish().await
}

#[tauri::command]
pub async fn rpc_get_code(address: Address, chain_id: u64) -> Result<Option<Bytes>> {
    Ok(utils::get_code(address, chain_id).await?)
}

#[tauri::command]
pub async fn rpc_is_contract(address: Address, chain_id: u64) -> Result<bool> {
    let code = utils::get_code(address, chain_id).await?;
    Ok(code.is_some())
}
