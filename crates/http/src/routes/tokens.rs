use axum::{extract::Path, routing::get, Json, Router};

use crate::{Ctx, Error, Result};
use iron_token_list::Token;
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
) -> Result<Json<Token>> {
    match iron_token_list::get_token(chain_id, address) {
        Ok(token) => Ok(Json(token)),
        Err(_) => Err(Error::NotFound),
    }
}
