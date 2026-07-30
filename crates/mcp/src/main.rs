use std::sync::Arc;

use ethui_mcp::{server::EthuiMcp, ws::WsBackend, ws_port_from_env};
use rmcp::{ServiceExt as _, transport::stdio};
use tracing_subscriber::{EnvFilter, fmt};

#[tokio::main]
async fn main() -> color_eyre::Result<()> {
    // stdout belongs to the MCP transport. Every log line goes to stderr; a
    // single stray stdout write corrupts the protocol for the whole session.
    // This is also why `ethui_tracing::setup()` must not be called here — it
    // installs a stdout layer.
    fmt()
        .with_writer(std::io::stderr)
        .with_ansi(false)
        .with_env_filter(EnvFilter::from_default_env())
        .init();

    let backend = Arc::new(WsBackend::new(ws_port_from_env()));
    let server = EthuiMcp::new(backend).serve(stdio()).await?;

    server.waiting().await?;

    Ok(())
}
