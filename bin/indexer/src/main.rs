mod config;
mod provider;
mod sync;

use color_eyre::eyre::Result;
use config::Config;

#[tokio::main]
async fn main() -> Result<()> {
    color_eyre::install()?;
    iron_tracing::init()?;

    let config = Config::read()?;

    dbg!(&config);
    let sync_handle = sync::Sync::start(&config).await?;

    sync_handle.await??;

    Ok(())
}
