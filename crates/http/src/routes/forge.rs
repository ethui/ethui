use axum::{extract::Query, Json};
use iron_types::{Abi, Address};
use serde::Deserialize;

use crate::Result;

#[derive(Debug, Deserialize)]
pub(crate) struct ForgeParams {
    address: Address,
    chain_id: u32,
}

pub(crate) async fn get_abi_handler(
    Query(params): Query<ForgeParams>,
) -> Result<Json<Option<Abi>>> {
    Ok(Json(
        iron_forge::commands::forge_get_abi(params.address, params.chain_id).await?,
    ))
}

pub(crate) async fn get_name_handler(
    Query(params): Query<ForgeParams>,
) -> Result<Json<Option<String>>> {
    Ok(Json(
        iron_forge::commands::forge_get_name(params.address, params.chain_id).await?,
    ))
}
