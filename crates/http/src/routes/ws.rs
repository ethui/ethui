use axum::Json;
use serde_json::Value;

use crate::Result;

pub(crate) async fn get_peers_by_domain_handler() -> Result<Json<Value>> {
    Ok(Json(serde_json::to_value(
        &(iron_ws::commands::ws_peers_by_domain().await),
    )?))
}
