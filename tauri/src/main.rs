// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod abis;
mod app;
mod commands;
mod context;
mod db;
mod dialogs;
mod error;
mod networks;
mod peers;
mod rpc;
mod store;
mod types;
mod ws;

use context::Context;
use error::Result;
use networks::Networks;
use peers::Peers;
use types::GlobalState;

#[tokio::main]
async fn main() -> Result<()> {
    color_eyre::install()?;
    env_logger::init();
    fix_path_env::fix()?;

    let mut app = app::IronApp::build();
    let mut ctx = Context::from_settings_file().await?;

    Peers::init(app.sender.clone()).await;
    {
        let ctx_inner = ctx.lock().await;
        Networks::init((
            app.get_resource("networks.json"),
            app.sender.clone(),
            ctx_inner.db.clone(),
        ))
        .await;
    }

    // now we're able to build our context
    // this relies on $APPDIR retrieved from Tauri
    ctx.init(app.sender.clone()).await?;

    // run websockets server loop
    {
        let ctx = ctx.clone();
        tauri::async_runtime::spawn(async move { ws::ws_server_loop(ctx).await });
    }

    // make context available to tauri's runtime
    // and run it
    app.manage(ctx);
    app.run();

    Ok(())
}
