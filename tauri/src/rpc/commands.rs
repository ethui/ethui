use super::{Handler, Result};

#[tauri::command]
pub async fn rpc_send_transaction(params: serde_json::Value) -> Result<serde_json::Value> {
    Ok(Handler::send_transaction(params).await?)
}
