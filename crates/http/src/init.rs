use axum::{
    extract::Query,
    routing::{get, post},
    Json, Router,
};
use serde::Deserialize;
use serde_json::Value;

use crate::error::{Error, Result};

use iron_types::ChecksummedAddress;

pub async fn init() {
    tokio::spawn(async {
        let routes = Router::new().merge(rpc_proxy()).merge(iron_namespace());

        let addr = std::env::var("IRON_HTTP_SERVER_ENDPOINT")
            .unwrap_or("127.0.0.1:9003".into())
            .parse()
            .unwrap();

        axum::Server::bind(&addr)
            .serve(routes.into_make_service())
            .await
            .unwrap();
    });
}

fn rpc_proxy() -> Router {
    Router::new().route("/", post(rpc_handler))
}

fn iron_namespace() -> Router {
    Router::new().route("/iron/foundry_get_abi", get(foundry_get_abi_handler))
}

#[derive(Debug, Deserialize)]
struct FoundryGetAbiParams {
    address: ChecksummedAddress,
    chain_id: u32,
}

async fn foundry_get_abi_handler(Query(params): Query<FoundryGetAbiParams>) -> Result<Json<Value>> {
    let reply = iron_forge::commands::foundry_get_abi(params.address, params.chain_id)
        .await
        .map_err(Error::Foundry)
        .map(|abi| serde_json::to_value(abi).unwrap_or(serde_json::Value::Null))?;

    Ok(Json(reply))
}

#[derive(Debug, Deserialize)]
struct RpcParams {
    domain: Option<String>,
}

async fn rpc_handler(Query(params): Query<RpcParams>, payload: String) -> Result<Json<Value>> {
    let domain = params.domain;
    let handler = iron_rpc::Handler::new(domain);

    let reply = handler.handle(payload).await;
    let reply = reply.unwrap_or_else(|| serde_json::Value::Null.to_string());

    Ok(Json(serde_json::from_str(&reply)?))
}
