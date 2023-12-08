use axum::{
    extract::{Query, State},
    routing::get,
    Json, Router,
};
use iron_types::{Abi, Address};
use serde::Deserialize;

use crate::{Ctx, Result};

pub(super) fn router() -> Router<Ctx> {
    Router::new()
        .route("/abi", get(abi))
        .route("/name", get(name))
}

#[derive(Debug, Deserialize)]
pub(crate) struct ForgeParams {
    address: Address,
    chain_id: u32,
}

pub(crate) async fn abi(
    State(_): State<Ctx>,
    Query(params): Query<ForgeParams>,
) -> Result<Json<Option<Abi>>> {
    Ok(Json(
        iron_forge::commands::forge_get_abi(params.address, params.chain_id).await?,
    ))
}

pub(crate) async fn name(Query(params): Query<ForgeParams>) -> Result<Json<Option<String>>> {
    Ok(Json(
        iron_forge::commands::forge_get_name(params.address, params.chain_id).await?,
    ))
}
