mod routes;

use actix_cors::Cors;
use actix_web::{middleware::Logger, App, HttpServer};
use color_eyre::eyre::Result;
use tracing::info;

use crate::config::HttpConfig;

pub async fn server(config: &HttpConfig) -> Result<()> {
    info!("Starting server on 0.0.0.0:{}", config.port);

    HttpServer::new(|| {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header()
            .max_age(3600);

        App::new()
            .wrap(cors)
            .wrap(Logger::new(r#"%r %s %b %T"#))
            .service(routes::health)
    })
    .bind(("0.0.0.0", config.port))?
    .run()
    .await?;

    // tokio::spawn(async move { server.run().await })
    Ok(())
}
