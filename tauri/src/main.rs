// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

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
    let quit = CustomMenuItem::new("quit".to_string(), "Quit");
    let hide = CustomMenuItem::new("hide".to_string(), "Hide");
    let show = CustomMenuItem::new("show".to_string(), "Show");
    let tray_menu = SystemTrayMenu::new()
        .add_item(show)
        .add_item(hide)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(quit);

    let tray = SystemTray::new().with_menu(tray_menu);
    let app = tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::get_networks,
            commands::get_current_network,
            commands::set_current_network,
            commands::get_wallet,
            commands::set_wallet,
            commands::set_networks
        ])
        .system_tray(tray)
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
                "quit" => app.exit(0),
                "hide" => app.get_window("main").unwrap().hide().unwrap(),
                "show" => app.get_window("main").unwrap().show().unwrap(),
                _ => {}
            },

            _ => {}
        })
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

    app.run(|_, event| match event {
        // close to system tray
        tauri::RunEvent::ExitRequested { api, .. } => {
            api.prevent_exit();
        }
        _ => {}
    });

    Ok(())
}
