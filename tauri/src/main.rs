// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod context;
mod error;
mod rpc;
mod ws;

use color_eyre::Result;

fn main() -> Result<()> {
    env_logger::init();
    color_eyre::install()?;

    let ctx = context::Context::new();

    {
        let ctx = ctx.clone();
        tauri::async_runtime::spawn(async move { ws::ws_server_loop(ctx.clone()).await });
    }

    let ctx2 = ctx.clone();
    tauri::Builder::default()
        .manage(ctx.clone())
        .invoke_handler(tauri::generate_handler![
            commands::get_networks,
            commands::get_current_network,
            commands::set_current_network,
            commands::get_wallet,
            commands::set_wallet,
            commands::set_networks
        ])
        .setup(|app| {
            let db_path = app
                .path_resolver()
                .resolve_resource("db.sled")
                .expect("failed to resolve resource")
                .clone();

            {
                tauri::async_runtime::spawn(async move {
                    let mut ctx = ctx2.lock().await;
                    ctx.connect_db(db_path).expect("could not connect to DB");
                });
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    Ok(())
}
