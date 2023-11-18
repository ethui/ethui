use iron_db::DB;
use tower_http::{
    cors::{Any, CorsLayer},
    trace::TraceLayer,
};

use crate::routes::router;

#[derive(Clone)]
pub(crate) struct Ctx {
    #[allow(unused)]
    pub(crate) db: DB,
}

pub async fn init(db: DB) {
    tokio::spawn(async {
        let addr = std::env::var("IRON_HTTP_SERVER_ENDPOINT")
            .unwrap_or("127.0.0.1:9003".into())
            .parse()
            .unwrap();

        let cors = CorsLayer::new()
            .allow_headers(Any)
            .allow_methods(Any)
            .allow_origin(Any)
            .expose_headers(Any);

        let app = router()
            .with_state(Ctx { db })
            .layer(cors)
            .layer(TraceLayer::new_for_http());

        tracing::debug!("HTTP server listening on: {}", addr);

        axum::Server::bind(&addr)
            .serve(app.into_make_service())
            .await
            .unwrap();
    });
}
