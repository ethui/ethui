use std::collections::HashMap;

use axum::{routing::get, Json, Router};
use iron_ws::peers::Peer;

use crate::{Ctx, Result};

pub(super) fn router() -> Router<Ctx> {
    Router::new().route("/peers_by_domain", get(peers_by_domain))
}

pub(crate) async fn peers_by_domain() -> Result<Json<HashMap<String, Vec<Peer>>>> {
    Ok(Json(iron_ws::commands::ws_peers_by_domain().await))
}
