use axum::Router;

use crate::Ctx;

mod connections;
mod contracts;
mod db;
mod forge;
mod internals;
mod networks;
mod rpc;
mod settings;
mod simulator;
mod sync;
mod wallets;
mod ws;

pub(crate) fn router() -> Router<Ctx> {
    Router::new()
        .nest(
            "/iron",
            Router::new()
                .nest("/connections", connections::router())
                .nest("/contracts", contracts::router())
                .nest("/db", db::router())
                .nest("/forge", forge::router())
                .nest("/settings", settings::router())
                .nest("/simulator", simulator::router())
                .nest("/sync", sync::router())
                .nest("/wallets", wallets::router())
                .nest("/networks", networks::router())
                .nest("/ws", ws::router())
                .nest("/internals", internals::router()),
        )
        .nest("/", rpc::router())
}
