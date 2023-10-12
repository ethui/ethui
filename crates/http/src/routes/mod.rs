use axum::Router;

use crate::Ctx;

mod connections;
mod contracts;
mod forge;
mod networks;
mod rpc;
mod settings;
mod ws;

pub(crate) fn router() -> Router<Ctx> {
    Router::new()
        .nest(
            "/iron",
            Router::new()
                .nest("/connections", connections::router())
                .nest("/contracts", contracts::router())
                .nest("/forge", forge::router())
                .nest("/networks", networks::router())
                .nest("/settings", settings::router())
                .nest("/ws", ws::router()),
        )
        .nest("/", rpc::router())
}
