use axum::{extract::Query, routing::post, Json, Router};
use serde::Deserialize;
use serde_json::Value;

use crate::error::Result;

pub async fn init() {
    tokio::spawn(async {
        let routes = Router::new().merge(routes_rpc());

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

fn routes_rpc() -> Router {
    Router::new().route("/", post(handler_rpc))
}

#[derive(Debug, Deserialize)]
struct RpcParams {
    domain: Option<String>,
}

async fn handler_rpc(Query(params): Query<RpcParams>, payload: String) -> Result<Json<Value>> {
    let domain = params.domain;
    let handler = iron_rpc::Handler::new(domain);

    let reply = handler.handle(payload).await;
    let reply = reply.unwrap_or_else(|| serde_json::Value::Null.to_string());

    Ok(Json(serde_json::from_str(&reply)?))
}
