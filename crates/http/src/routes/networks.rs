use axum::{
    extract::Query,
    routing::{get, post},
    Json, Router,
};
use iron_networks::Network;
use serde::Deserialize;

use crate::{Ctx, Result};

#[derive(Debug, Deserialize)]
pub(crate) struct SetNetworkParams {
    network: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SetNetworkListParams {
    new_networks: Vec<Network>,
}

pub(super) fn router() -> Router<Ctx> {
    Router::new()
        .route("/current", get(current))
        .route("/current", post(set_current))
        .route("/list", get(list))
        .route("/list", post(set_list))
        .route("/reset", post(reset))
}

pub(crate) async fn current() -> Result<Json<Network>> {
    Ok(Json(iron_networks::commands::networks_get_current().await?))
}

pub(crate) async fn set_current(Query(params): Query<SetNetworkParams>) -> Result<()> {
    iron_networks::commands::networks_set_current(params.network).await?;

    Ok(())
}

pub(crate) async fn list() -> Result<Json<Vec<Network>>> {
    Ok(Json(iron_networks::commands::networks_get_list().await?))
}

pub(crate) async fn set_list(Json(payload): Json<SetNetworkListParams>) -> Result<()> {
    iron_networks::commands::networks_set_list(payload.new_networks).await?;

    Ok(())
}

pub(crate) async fn reset() -> Result<Json<Vec<Network>>> {
    Ok(Json(iron_networks::commands::networks_reset().await?))
}
