// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod app;
mod error;

use error::Result;

use iron_core::{
    alchemy::Alchemy, foundry::Foundry, networks::Networks, peers::Peers, settings::Settings,
    wallets::Wallets, ws,
};
use iron_db::DB;
use iron_types::GlobalState;

#[tokio::main]
async fn main() -> Result<()> {
    color_eyre::install()?;
    env_logger::init();
    fix_path_env::fix()?;

    let mut app = app::IronApp::build();
    let db = DB::connect(&app.get_resource_path("db.sqlite3")).await?;
    Settings::init(app.get_resource_path("settings.json")).await;
    Peers::init(app.sender.clone()).await;
    Wallets::init((app.get_resource_path("wallets.json"), app.sender.clone())).await;
    Networks::init((
        app.get_resource_path("networks.json"),
        app.sender.clone(),
        db.clone(),
    ))
    .await;
    Foundry::init().await?;
    Alchemy::init((db.clone(), app.sender.clone())).await;

    // run websockets server loop
    tauri::async_runtime::spawn(async move { ws::ws_server_loop().await });

    // make context available to tauri's runtime
    // and run it
    app.manage(db);
    app.run();

    Ok(())
}
