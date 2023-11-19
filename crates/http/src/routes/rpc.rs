use axum::{
    extract::{Query, State},
    routing::post,
    Json, Router,
};
use serde::Deserialize;
use serde_json::Value;

use crate::{Ctx, Result};

pub(super) fn router() -> Router<Ctx> {
    Router::new().route("/", post(handler))
}

#[derive(Debug, Deserialize)]
struct RpcParams {
    domain: Option<String>,
}

async fn handler(
    State(_): State<Ctx>,
    Query(params): Query<RpcParams>,
    payload: String,
) -> Result<Json<Value>> {
    let handler = iron_rpc::Handler::new(params.domain)?;

    let reply = handler.handle_raw(&payload.to_string()).await;
    let reply = reply
        .map(|r| serde_json::from_str(&r.result).unwrap())
        .unwrap_or_else(|e| serde_json::from_str(&e.to_string()).unwrap());

    Ok(Json(reply))
}
