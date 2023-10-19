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
    let domain = params.domain;
    let handler = iron_rpc::Handler::new(domain);

    let reply = handler.handle(payload).await;
    let reply = reply.unwrap_or_else(|| serde_json::Value::Null.to_string());

    Ok(Json(serde_json::from_str(&reply)?))
}
