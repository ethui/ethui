// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod context;
mod error;
mod rpc;
mod ws;

use color_eyre::Result;
use tauri::Manager;

fn main() -> Result<()> {
    env_logger::init();
    color_eyre::install()?;

    let app = tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::get_networks,
            commands::get_current_network,
            commands::set_current_network,
            commands::get_wallet,
            commands::set_wallet,
            commands::set_networks
        ])
        .build(tauri::generate_context!())
        .expect("error while running tauri application");

    let db_path = app
        .path_resolver()
        .resolve_resource("db.sled")
        .expect("failed to resolve resource")
        .clone();

    let ctx = context::Context::try_new(db_path)?;
    app.manage(ctx.clone());
    tauri::async_runtime::spawn(async move { ws::ws_server_loop(ctx).await });

    app.run(|_, _| {});

    Ok(())
}
