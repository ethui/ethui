use axum::{extract::Path, routing::get, Json, Router};

use crate::{Ctx, Result};
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub(crate) struct TokenParams {
    #[serde(rename = "chainId")]
    chain_id: i32,
    address: String,
}

pub(super) fn router() -> Router<Ctx> {
    Router::new().route("/:chainId/:address", get(token))
}

pub(crate) async fn token(
    Path(TokenParams { chain_id, address }): Path<TokenParams>,
) -> Result<Json<()>> {
    Ok(Json(()))
}
