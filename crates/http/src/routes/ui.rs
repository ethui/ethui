use axum::{routing::post, Router};

use crate::{Ctx, Result};

pub(super) fn router() -> Router<Ctx> {
    Router::new()
        .route("/show", post(show))
        .route("/hide", post(hide))
}

pub(crate) async fn show() -> Result<()> {
    ethui_broadcast::main_window_show().await;
    Ok(())
}

pub(crate) async fn hide() -> Result<()> {
    ethui_broadcast::main_window_hide().await;
    Ok(())
}
