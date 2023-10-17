use axum::{routing::post, Json, Router};

use crate::{Ctx, Result};

pub(super) fn router() -> Router<Ctx> {
    Router::new().route("/send_transaction", post(send_transaction))
}

pub(crate) async fn send_transaction(
    Json(payload): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>> {
    Ok(Json(iron_rpc::commands::rpc_send_transaction(payload).await?))
}
