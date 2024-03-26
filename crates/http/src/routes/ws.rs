use std::collections::HashMap;

use axum::{routing::get, Json, Router};
use ethui_ws::peers::Peer;

use crate::{Ctx, Result};

pub(super) fn router() -> Router<Ctx> {
    Router::new()
        .route("/peers_by_domain", get(peers_by_domain))
        .route("/peer_count", get(peer_count))
}

pub(crate) async fn peers_by_domain() -> Result<Json<HashMap<String, Vec<Peer>>>> {
    Ok(Json(ethui_ws::commands::ws_peers_by_domain().await))
}

pub(crate) async fn peer_count() -> Result<Json<usize>> {
    Ok(Json(ethui_ws::commands::ws_peer_count().await))
}
