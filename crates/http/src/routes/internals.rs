use axum::Json;
use axum::{routing::get, Router};

use crate::Ctx;

pub(super) fn router() -> Router<Ctx> {
    Router::new()
        .route("/build_mode", get(build_mode))
        .route("/version", get(version))
}

pub(crate) async fn build_mode() -> Json<String> {
    let res = if cfg!(debug_assertions) {
        "debug".to_string()
    } else {
        "release".to_string()
    };

    Json(res)
}

pub(crate) async fn version() -> Json<String> {
    Json(std::env!("CARGO_PKG_VERSION").replace('\"', ""))
}
