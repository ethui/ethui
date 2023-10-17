use axum::{routing::get, Router};

use crate::Ctx;

pub(super) fn router() -> Router<Ctx> {
    Router::new()
        .route("/build_mode", get(build_mode))
        .route("/version", get(version))
}

pub(crate) async fn build_mode() -> String {
    if cfg!(debug_assertions) {
        "debug".to_string()
    } else {
        "release".to_string()
    }
}

pub(crate) async fn version() -> String {
    std::env!("CARGO_PKG_VERSION").replace('\"', "")
}
