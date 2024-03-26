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
    let handler = ethui_rpc::Handler::new(params.domain);

    let reply = handler
        .handle(serde_json::from_str(&payload.to_string()).unwrap())
        .await;
    let reply = reply
        .map(|r| serde_json::to_value(&r).unwrap())
        .unwrap_or_else(|| serde_json::Value::Null);

    Ok(Json(reply))
}
