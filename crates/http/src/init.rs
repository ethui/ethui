use axum::{response::Html, routing::get, Router};

pub async fn init() {
    tokio::spawn(async {
        let routes = Router::new().route("/", get(Html("Hello world!")));

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
