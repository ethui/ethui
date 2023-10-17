use axum::{
    extract::Path,
    routing::{get, post},
    Json, Router,
};
use iron_types::Affinity;
use serde::Deserialize;

use crate::{Ctx, Result};

pub(super) fn router() -> Router<Ctx> {
    Router::new()
        .route("/affinities/:domain", get(get_affinity))
        .route("/affinities/:domain", post(set_affinity))
}

pub(crate) async fn get_affinity(Path(domain): Path<String>) -> Json<Affinity> {
    Json(iron_connections::commands::connections_affinity_for(domain).await)
}

#[derive(Debug, Deserialize)]
pub(crate) struct SetAffinityPayload {
    affinity: Affinity,
}

pub(crate) async fn set_affinity(
    Path(domain): Path<String>,
    Json(payload): Json<SetAffinityPayload>,
) -> Result<()> {
    iron_connections::commands::connections_set_affinity(&domain, payload.affinity).await?;

    Ok(())
}
