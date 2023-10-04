use axum::{
    routing::{get, post},
    Router,
};

mod forge;
mod rpc;

pub(crate) fn router() -> Router {
    let rpc = Router::new().route("/", post(rpc::handler));

    let forge = Router::new().nest(
        "/forge",
        Router::new().route("/abi", get(forge::get_abi_handler)),
    );

    Router::new().merge(rpc).nest("/iron", forge)
}
