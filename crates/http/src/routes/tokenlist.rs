use axum::{extract::Query, routing::get, Json, Router};

use crate::{Ctx, Result};
use serde::Deserialize;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TokenListParams {
    chain_id: i32,
    address: String,
}

pub(super) fn router() -> Router<Ctx> {
    Router::new().route("/", get(token_list))
}

pub(crate) async fn token_list(params: Query<TokenListParams>) -> Result<Json<()>> {
    Ok(Json(()))
}
