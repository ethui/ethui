// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod context;
mod error;
mod rpc;
mod ws;

use color_eyre::Result;

#[tokio::main]
async fn main() -> Result<()> {
    env_logger::init();
    color_eyre::install()?;

    let ctx = context::Context::new();

    {
        let ctx = ctx.clone();
        tokio::spawn(async move { ws::ws_server_loop(ctx).await });
    }

    tauri::Builder::default()
        .manage(ctx)
        .invoke_handler(tauri::generate_handler![
            commands::get_networks,
            commands::get_current_network,
            commands::set_current_network,
            commands::get_wallet,
            commands::set_wallet,
            commands::set_networks
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    Ok(())
}
