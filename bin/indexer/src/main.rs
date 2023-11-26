mod api;
mod config;
mod provider;
mod sync;

use color_eyre::eyre::Result;
use config::Config;
use futures::future;
use tokio::pin;

#[tokio::main]
async fn main() -> Result<()> {
    color_eyre::install()?;
    iron_tracing::init()?;

    let config = Config::read()?;
    let sync = sync::Sync::start(&config)?;
    let api = api::server(&config.http);
    dbg!("here");

    pin!(sync, api);
    future::select(sync, api).await;

    Ok(())
}
