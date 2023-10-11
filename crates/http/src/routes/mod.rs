use axum::Router;

use crate::Ctx;

mod connections;
mod contracts;
mod forge;
mod networks;
mod rpc;
mod ws;

pub(crate) fn router() -> Router<Ctx> {
    Router::new()
        .nest(
            "/iron",
            Router::new()
                .nest("/forge", forge::router())
                .nest("/connections", connections::router())
                .nest("/contracts", contracts::router())
                .nest("/networks", networks::router())
                .nest("/ws", ws::router()),
        )
        .nest("/", rpc::router())
}
