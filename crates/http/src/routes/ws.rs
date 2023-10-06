use std::collections::HashMap;

use axum::Json;
use iron_ws::peers::Peer;

use crate::Result;

pub(crate) async fn get_peers_by_domain_handler() -> Result<Json<HashMap<String, Vec<Peer>>>> {
    Ok(Json(iron_ws::commands::ws_peers_by_domain().await))
}
