use axum::{routing::post, Json, Router};
use serde::Deserialize;

use crate::{Ctx, Result};

pub(super) fn router() -> Router<Ctx> {
    Router::new().route("/sign-and-send", post(send_transaction))
    // .route("/simulate", post(simulate))
}

pub(crate) async fn send_transaction(
    Json(payload): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>> {
    Ok(Json(
        ethui_rpc::commands::rpc_send_transaction(payload).await?,
    ))
}

// #[derive(Debug, Deserialize)]
// #[serde(rename_all = "camelCase")]
// pub(crate) struct SimulationPayload {
//     chain_id: u32,
//     request: ethui_simulator::Request,
// }
//
// pub(crate) async fn simulate(
//     Json(SimulationPayload { chain_id, request }): Json<SimulationPayload>,
// ) -> Result<Json<ethui_simulator::types::Result>> {
//     Ok(Json(
//         ethui_simulator::commands::simulator_run(chain_id, request).await?,
//     ))
// }
