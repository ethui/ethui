use color_eyre::Result;
use tauri::{
    CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem,
};

use crate::commands;

pub struct IronApp(tauri::App);

impl IronApp {
    pub fn build() -> Self {
        let tray = Self::build_tray();
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
                    "show" => {
                        if let Some(w) = app.get_window("main") {
                            w.show().unwrap()
                        } else {
                            tauri::WindowBuilder::new(
                                app,
                                "main",
                                tauri::WindowUrl::App("index.html".into()),
                            )
                            .build()
                            .unwrap();
                        }
                    }
                    _ => {}
                },

                _ => {}
            })
            .build(tauri::generate_context!())
            .expect("error while running tauri application");

        Self(app)
    }

    fn build_tray() -> tauri::SystemTray {
        let quit = CustomMenuItem::new("quit".to_string(), "Quit");
        let hide = CustomMenuItem::new("hide".to_string(), "Hide");
        let show = CustomMenuItem::new("show".to_string(), "Show");
        let tray_menu = SystemTrayMenu::new()
            .add_item(show)
            .add_item(hide)
            .add_native_item(SystemTrayMenuItem::Separator)
            .add_item(quit);

        SystemTray::new().with_menu(tray_menu)
    }
}
