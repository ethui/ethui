// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod app;
mod commands;
mod context;
mod error;
mod rpc;
mod ws;

use color_eyre::Result;
use tauri::{
    CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem,
};

fn main() -> Result<()> {
    env_logger::init();
    color_eyre::install()?;

    // here `"quit".to_string()` defines the menu item id, and the second parameter is the menu item label.

    let app = app::IronApp::build();
    let db_path = app
        .path_resolver()
        .resolve_resource("db.sled")
        .expect("failed to resolve resource")
        .clone();

    let ctx = context::Context::try_new(db_path)?;
    app.manage(ctx.clone());
    tauri::async_runtime::spawn(async move { ws::ws_server_loop(ctx).await });

    app.run(|_, event| match event {
        // close to system tray
        tauri::RunEvent::ExitRequested { api, .. } => {
            api.prevent_exit();
        }
        _ => {}
    });

    Ok(())
}
