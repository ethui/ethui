use iron_args::Args;
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

pub async fn init(args: &Args, db: DB) {
    let port = args.http_port;

    tokio::spawn(async move {
        let addr = format!("127.0.0.1:{}", port).parse().unwrap();

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
