use clap::Parser;
use color_eyre::eyre::Result;
use ethui_sync_dev_net::tracker::{
    consumer::Consumer,
    worker::{Msg, create_worker},
};
use ethui_types::{Network, NetworkStatus};
use tokio::signal;
use tracing::{info, warn};
use url::Url;

#[derive(Parser)]
#[command(name = "anvil-worker")]
#[command(about = "A test worker for Anvil blockchain synchronization")]
struct Args {
    /// RPC URL for the Anvil node
    #[arg(short, long, default_value = "http://localhost:8545")]
    rpc_url: String,

    /// WebSocket URL for the Anvil node (optional)
    #[arg(short, long)]
    ws_url: Option<String>,
}

#[derive(Clone)]
struct LoggingConsumer;

impl Consumer for LoggingConsumer {
    async fn process(&mut self, msg: Msg) -> color_eyre::Result<()> {
        match msg {
            Msg::Reset => {
                info!("🔄 Worker reset");
            }
            Msg::CaughtUp => {
                info!("✅ Caught up with latest blocks");
            }
            Msg::Block { hash, .. } => {
                info!("📦 Block {}", &hash.to_string()[..10]);
            }
        }

        Ok(())
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    color_eyre::install()?;
    tracing_subscriber::fmt::init();

    let args = Args::parse();

    info!("🚀 Starting Anvil worker");
    info!("📡 RPC URL: {}", args.rpc_url);
    if let Some(ref ws_url) = args.ws_url {
        info!("🔌 WebSocket URL: {}", ws_url);
    }

    // Parse URLs
    let http_url =
        Url::parse(&args.rpc_url).map_err(|e| color_eyre::eyre::eyre!("Invalid RPC URL: {}", e))?;

    let ws_url = args
        .ws_url
        .as_ref()
        .map(|url| Url::parse(url))
        .transpose()
        .map_err(|e| color_eyre::eyre::eyre!("Invalid WebSocket URL: {}", e))?;

    // Create network configuration
    let network = Network {
        id: (31337u32, 0u32).into(), // Default Anvil chain ID
        name: "test".into(),
        explorer_url: None,
        http_url,
        ws_url,
        currency: "ETH".to_string(),
        decimals: 18,
        status: NetworkStatus::Unknown,
        is_stack: false,
    };

    // Create worker
    let worker = create_worker(network.clone());
    let consumer = LoggingConsumer;

    info!("🏗️  Created worker for network: {}", network.name);
    if network.ws_url.is_some() {
        info!("🔌 Using WebSocket provider");
    } else {
        info!("🌐 Using HTTP provider");
    }

    // Set up graceful shutdown
    let (quit_tx, quit_rx) = tokio::sync::oneshot::channel();

    // Spawn worker task
    let worker_handle = tokio::spawn(async move {
        worker.run(quit_rx, consumer).await;
        info!("👋 Worker stopped");
    });

    // Wait for Ctrl+C
    info!("🎯 Worker running. Press Ctrl+C to stop...");
    match signal::ctrl_c().await {
        Ok(()) => {
            info!("🛑 Shutdown signal received");
        }
        Err(err) => {
            warn!("Unable to listen for shutdown signal: {}", err);
        }
    }

    // Send quit signal
    if quit_tx.send(()).is_err() {
        warn!("Worker already stopped");
    }

    // Wait for worker to finish
    if let Err(e) = worker_handle.await {
        warn!("Worker task failed: {}", e);
    }

    info!("✅ Shutdown complete");
    Ok(())
}
