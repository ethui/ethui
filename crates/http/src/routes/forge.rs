use axum::{extract::Query, Json};
use iron_forge::Abi;
use iron_types::ChecksummedAddress;
use serde::Deserialize;

use crate::error::Result;

#[derive(Debug, Deserialize)]
pub(crate) struct ForgeGetAbiParams {
    address: ChecksummedAddress,
    chain_id: u32,
}

pub(crate) async fn get_abi_handler(
    Query(params): Query<ForgeGetAbiParams>,
) -> Result<Json<Option<Abi>>> {
    Ok(Json(
        iron_forge::commands::forge_get_abi(params.address, params.chain_id).await?,
    ))
}
