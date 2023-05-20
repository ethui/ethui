// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod abis;
mod app;
mod commands;
mod context;
mod db;
mod dialogs;
mod error;
mod peers;
mod rpc;
mod store;
mod types;
mod wallets;
mod ws;

use context::Context;
use error::Result;
use peers::Peers;
use types::GlobalState;
use wallets::Wallets;

#[tokio::main]
async fn main() -> Result<()> {
    color_eyre::install()?;
    env_logger::init();
    fix_path_env::fix()?;

    let mut app = app::IronApp::build();
    Peers::init(app.sender.clone()).await;
    Wallets::init(app.get_settings_file("wallets")).await;

    // now we're able to build our context
    // this relies on $APPDIR retrieved from Tauri
    let mut ctx = Context::from_settings_file().await?;
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
