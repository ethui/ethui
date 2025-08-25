use ethui_types::prelude::*;

use super::{Handler, Result};

#[tauri::command]
pub async fn rpc_send_transaction(params: serde_json::Value) -> Result<serde_json::Value> {
    Ok(Handler::send_transaction(params, Default::default()).await?)
}

#[tauri::command]
pub async fn rpc_eth_call(params: serde_json::Value) -> Result<Bytes> {
    Ok(Handler::send_call(params, Default::default()).await?)
}

#[tauri::command]
pub async fn rpc_get_code(address: Address, chain_id: u32) -> Result<Option<String>> {
    Ok(Handler::get_code(address, chain_id).await?)
}

#[tauri::command]
pub async fn rpc_is_contract(address: Address, chain_id: u32) -> Result<bool> {
    let code = Handler::get_code(address, chain_id).await?;
    Ok(code.is_some())
}
