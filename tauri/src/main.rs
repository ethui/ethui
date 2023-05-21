// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod abis;
mod app;
mod context;
mod db;
mod dialogs;
mod error;
mod networks;
mod peers;
mod rpc;
mod store;
mod types;
mod wallets;
mod ws;
mod wallets;

use context::Context;
use db::DB;
use error::Result;
use networks::Networks;
use peers::Peers;
use types::GlobalState;
use wallets::Wallets;

#[tokio::main]
async fn main() -> Result<()> {
    color_eyre::install()?;
    env_logger::init();
    fix_path_env::fix()?;

    let mut app = app::IronApp::build();
    let db = DB::connect(&app.get_resource_path("db.sqlite3")).await?;

    let mut ctx = Context::from_settings_file().await?;

    Peers::init(app.sender.clone()).await;
    Wallets::init(app.get_resource_path("wallets.json")).await;
    Networks::init((
        app.get_resource_path("networks.json"),
        app.sender.clone(),
        db.clone(),
    ))
    .await;
    Wallets::init(app.get_resource_path("wallets.json")).await;

    // now we're able to build our context
    // this relies on $APPDIR retrieved from Tauri
    ctx.init(app.sender.clone()).await?;

    // run websockets server loop
    tauri::async_runtime::spawn(async move { ws::ws_server_loop().await });

    // make context available to tauri's runtime
    // and run it
    app.manage(ctx, db);
    app.run();

    Ok(())
}
