use axum::{
    extract::{Query, State},
    routing::get,
    Json, Router,
};
use ethui_types::{Address, Contract, ContractWithAbi};
use serde::Deserialize;

use crate::{Ctx, Result};

pub(super) fn router() -> Router<Ctx> {
    Router::new()
        .route("/", get(index))
        .route("/show", get(show))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct IndexParams {
    chain_id: u32,
}

/// Retrieves the name for a given chain_id/address
/// Forwards to either the DB or the forge watcher depending on the network
async fn index(
    State(ctx): State<Ctx>,
    Query(params): Query<IndexParams>,
) -> Result<Json<Vec<Contract>>> {
    Ok(Json(ctx.db.get_contracts(params.chain_id).await?))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ShowParams {
    address: Address,
    chain_id: u32,
}

/// Retrieves the name for a given chain_id/address
/// Forwards to either the DB or the forge watcher depending on the network
async fn show(
    State(ctx): State<Ctx>,
    Query(params): Query<ShowParams>,
) -> Result<Json<Option<ContractWithAbi>>> {
    Ok(Json(
        ctx.db.get_contract(params.chain_id, params.address).await?,
    ))
}
