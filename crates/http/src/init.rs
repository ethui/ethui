use crate::routes::router;

pub async fn init() {
    tokio::spawn(async {
        let addr = std::env::var("IRON_HTTP_SERVER_ENDPOINT")
            .unwrap_or("127.0.0.1:9003".into())
            .parse()
            .unwrap();

        axum::Server::bind(&addr)
            .serve(router().into_make_service())
            .await
            .unwrap();
    });
}
