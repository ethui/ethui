use jsonrpsee::types::Params;
use tokio::sync::Mutex;

use super::{Handler, Result};
use crate::Ctx;

#[tauri::command]
pub async fn rpc_send_transaction(params: serde_json::Value) -> Result<serde_json::Value> {
    let ctx = Mutex::new(Ctx::empty());
    let ctx = ctx.lock().await;
    let params = serde_json::to_string(&params).unwrap();
    Handler::send_transaction(Params::new(Some(&params)), ctx).await
}
