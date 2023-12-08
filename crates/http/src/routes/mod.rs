use axum::Router;

use crate::Ctx;

mod contracts;
mod rpc;
mod transactions;
mod ui;

#[cfg(feature = "http-insecure-endpoints")]
mod connections;
#[cfg(feature = "http-insecure-endpoints")]
mod db;
#[cfg(feature = "http-insecure-endpoints")]
mod forge;
#[cfg(feature = "http-insecure-endpoints")]
mod internals;
#[cfg(feature = "http-insecure-endpoints")]
mod networks;
#[cfg(feature = "http-insecure-endpoints")]
mod settings;
#[cfg(feature = "http-insecure-endpoints")]
mod sync;
#[cfg(feature = "http-insecure-endpoints")]
mod wallets;
#[cfg(feature = "http-insecure-endpoints")]
mod ws;

pub(crate) fn router() -> Router<Ctx> {
    Router::new()
        .nest("/iron", iron_routes())
        .nest("/", rpc::router())
}

#[cfg(not(feature = "http-insecure-endpoints"))]
fn iron_routes() -> Router<Ctx> {
    Router::new()
        .nest("/transactions", transactions::router())
        .nest("/contracts", contracts::router())
        .nest("/ui", ui::router())
}

#[cfg(feature = "http-insecure-endpoints")]
fn iron_routes() -> Router<Ctx> {
    Router::new()
        .nest("/connections", connections::router())
        .nest("/contracts", contracts::router())
        .nest("/ui", ui::router())
        .nest("/db", db::router())
        .nest("/forge", forge::router())
        .nest("/settings", settings::router())
        .nest("/sync", sync::router())
        .nest("/transactions", transactions::router())
        .nest("/wallets", wallets::router())
        .nest("/networks", networks::router())
        .nest("/ws", ws::router())
        .nest("/internals", internals::router())
}
