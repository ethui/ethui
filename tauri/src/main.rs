// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod abis;
mod app;
mod commands;
mod context;
mod db;
mod dialogs;
mod error;
#[cfg(feature = "foundry-abi-watch")]
mod foundry;
mod rpc;
mod store;
mod ws;

use context::Context;
use error::Result;
#[cfg(feature = "foundry-abi-watch")]
use foundry::Foundry;

#[tokio::main]
async fn main() -> Result<()> {
    color_eyre::install()?;
    env_logger::init();
    fix_path_env::fix()?;

    #[cfg(feature = "foundry-abi-watch")]
    Foundry::init().await?;

    let mut app = app::IronApp::build();

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
