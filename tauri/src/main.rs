// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod app;
mod commands;
mod context;
mod db;
mod error;
mod rpc;
mod ws;

use color_eyre::Result;
use context::Context;

#[tokio::main]
async fn main() -> Result<()> {
    env_logger::init();
    color_eyre::install()?;

    let app = app::IronApp::build();

    // now we're able to build our context
    // this relies on $APPDIR retrieved from Tauri
    let ctx = Context::try_new(app.get_db_path()).await?;

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
