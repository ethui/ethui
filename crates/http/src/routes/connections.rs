use axum::{extract::Query, Json};
use iron_types::Affinity;
use serde::Deserialize;

use crate::Result;

#[derive(Debug, Deserialize)]
pub(crate) struct GetConnectionParams {
    domain: String,
}

#[derive(Debug, Deserialize)]
pub(crate) struct SetConnectionParams {
    domain: String,
    affinity: Affinity,
}

pub(crate) async fn get_connections_affinity_for_handler(
    Query(params): Query<GetConnectionParams>,
) -> Json<Affinity> {
    Json(iron_connections::commands::connections_affinity_for(params.domain).await)
}

pub(crate) async fn set_connections_affinity_for_handler(
    Json(payload): Json<SetConnectionParams>,
) -> Result<()> {
    iron_connections::commands::connections_set_affinity(&payload.domain, payload.affinity).await?;

    Ok(())
}
