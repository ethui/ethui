use axum::{
    routing::{get, post},
    Router,
};

mod forge;
mod rpc;
mod ws;

pub(crate) fn router() -> Router {
    let rpc = Router::new().route("/", post(rpc::handler));

    let forge = Router::new().nest(
        "/forge",
        Router::new()
            .route("/abi", get(forge::get_abi_handler))
            .route("/name", get(forge::get_name_handler)),
    );

    let ws = Router::new().nest(
        "/ws",
        Router::new().route("/peers_by_domain", get(ws::get_peers_by_domain_handler)),
    );

    let iron = Router::new().merge(forge).merge(ws);

    Router::new().merge(rpc).nest("/iron", iron)
}
