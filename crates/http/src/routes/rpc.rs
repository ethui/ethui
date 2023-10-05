use axum::{extract::Query, Json};
use serde::Deserialize;
use serde_json::Value;

use crate::Result;

#[derive(Debug, Deserialize)]
pub(super) struct RpcParams {
    domain: Option<String>,
}

pub(super) async fn handler(
    Query(params): Query<RpcParams>,
    payload: String,
) -> Result<Json<Value>> {
    let domain = params.domain;
    let handler = iron_rpc::Handler::new(domain);

    let reply = handler.handle(payload).await;
    let reply = reply.unwrap_or_else(|| serde_json::Value::Null.to_string());

    Ok(Json(serde_json::from_str(&reply)?))
}
