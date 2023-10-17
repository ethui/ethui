use axum::{routing::get, Json, Router};

use iron_simulator::{errors::SimulationResult, types::Result, Request};
use serde::Deserialize;

use crate::{Ctx, Result as HttpResult};

pub(super) fn router() -> Router<Ctx> {
    Router::new().route("/run", get(run))
}

#[derive(Debug, Deserialize)]
pub(crate) struct SimulationPayload {
    chain_id: u32,
    request: Request,
}

pub(crate) async fn run(
    Json(SimulationPayload { chain_id, request }): Json<SimulationPayload>,
) -> HttpResult<Json<SimulationResult<Result>>> {
    Ok(Json(
        iron_simulator::commands::simulator_run(chain_id, request).await,
    ))
}
