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
