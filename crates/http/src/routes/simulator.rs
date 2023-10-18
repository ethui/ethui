use axum::{routing::post, Json, Router};

use iron_simulator::Request;
use serde::Deserialize;

use crate::{Ctx, Result as HttpResult};

pub(super) fn router() -> Router<Ctx> {
    Router::new().route("/run", post(run))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SimulationPayload {
    chain_id: u32,
    request: Request,
}

pub(crate) async fn run(
    Json(SimulationPayload { chain_id, request }): Json<SimulationPayload>,
) -> HttpResult<Json<iron_simulator::types::Result>> {
    Ok(Json(
        iron_simulator::commands::simulator_run(chain_id, request).await?,
    ))
}
