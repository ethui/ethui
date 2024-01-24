use axum::{
    extract::{Query, State},
    routing::get,
    Json, Router,
};
use iron_networks::Networks;
use iron_types::{Abi, Address, GlobalState};
use serde::Deserialize;

use crate::{Ctx, Error, Result};

pub(super) fn router() -> Router<Ctx> {
    Router::new()
        .route("/name", get(name))
        .route("/abi", get(abi))
        .route("/contracts", get(contracts))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AbiParams {
    address: Address,
    chain_id: u32,
}

/// Retrieves the ABI for a given chain_id/address
/// Forwards to either the DB or the forge watcher depending on the network
async fn abi(ctx: State<Ctx>, params: Query<AbiParams>) -> Result<Json<Option<Abi>>> {
    let network = Networks::read()
        .await
        .get_network(params.chain_id)
        .ok_or(Error::InvalidNetwork)?;

    if network.is_dev() {
        Ok(Json(
            iron_forge::commands::forge_get_abi(params.address, params.chain_id).await?,
        ))
    } else {
        let abi = ctx
            .db
            .get_contract_abi(params.chain_id, params.address)
            .await?;

        Ok(Json(Some(abi)))
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct NameParams {
    address: Address,
    chain_id: u32,
}

/// Retrieves the name for a given chain_id/address
/// Forwards to either the DB or the forge watcher depending on the network
async fn name(
    State(ctx): State<Ctx>,
    Query(params): Query<NameParams>,
) -> Result<Json<Option<String>>> {
    let network = Networks::read()
        .await
        .get_network(params.chain_id)
        .ok_or(Error::InvalidNetwork)?;

    if network.is_dev() {
        Ok(Json(
            iron_forge::commands::forge_get_name(params.address, params.chain_id).await?,
        ))
    } else {
        let name = ctx
            .db
            .get_contract_name(params.chain_id, params.address)
            .await?;

        Ok(Json(Some(name)))
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ChainIdParams {
    chain_id: u32,
}

/// Retrieves all the contracts for a chain id
/// Forwards to either the DB or the forge watcher depending on the network
async fn contracts(
    State(ctx): State<Ctx>,
    Query(params): Query<ChainIdParams>,
) -> Result<Json<Vec<(Address, String)>>> {
    let network = Networks::read()
        .await
        .get_network(params.chain_id)
        .ok_or(Error::InvalidNetwork)?;

    let mut contracts = ctx.db.get_contracts_with_name(params.chain_id).await?;

    if network.is_dev() {
        for (a, n) in contracts.iter_mut() {
            if n.is_empty() {
                *n = iron_forge::commands::forge_get_name(*a, params.chain_id)
                    .await?
                    .unwrap_or(String::new());
            }
        }
    }

    Ok(Json(contracts))
}
