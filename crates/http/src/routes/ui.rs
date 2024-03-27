use axum::{routing::post, Router};

use crate::{Ctx, Result};

#[cfg(not(desktop))]
pub(super) fn router() -> Router<Ctx> {
    Router::new()
}

#[cfg(desktop)]
pub(super) fn router() -> Router<Ctx> {
    Router::new()
        .route("/show", post(show))
        .route("/hide", post(hide))
}

#[cfg(desktop)]
pub(crate) async fn show() -> Result<()> {
    ethui_broadcast::main_window_show().await;
    Ok(())
}

#[cfg(desktop)]
pub(crate) async fn hide() -> Result<()> {
    ethui_broadcast::main_window_hide().await;
    Ok(())
}
