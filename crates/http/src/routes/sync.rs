use axum::{extract::Query, routing::get, Json, Router};
use serde::Deserialize;

use crate::Ctx;

pub(super) fn router() -> Router<Ctx> {
    Router::new().route("/alchemy_supported", get(alchemy_supported))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ChainIdParams {
    chain_id: u32,
}

pub(crate) async fn alchemy_supported(
    Query(ChainIdParams { chain_id }): Query<ChainIdParams>,
) -> Json<bool> {
    Json(iron_sync_alchemy::supports_network(chain_id))
}
