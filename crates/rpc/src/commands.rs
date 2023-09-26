use super::{Handler, Result};
use crate::Ctx;

#[tauri::command]
pub async fn rpc_send_transaction(params: serde_json::Value) -> Result<serde_json::Value> {
    Ok(Handler::send_transaction(params, Ctx::empty()).await?)
}
