use std::{path::PathBuf, sync::OnceLock};

use tauri::{
    AppHandle, Builder, CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu,
    SystemTrayMenuItem,
};

use crate::{commands, context::Context};

pub struct IronApp(tauri::App);

pub static DB_PATH: OnceLock<PathBuf> = OnceLock::new();
pub static SETTINGS_PATH: OnceLock<PathBuf> = OnceLock::new();

impl IronApp {
    pub fn build() -> Self {
        let tray = Self::build_tray();
        let app = Builder::default()
            .invoke_handler(tauri::generate_handler![
                commands::get_networks,
                commands::get_current_network,
                commands::set_current_network,
                commands::get_wallet,
                commands::set_wallet,
                commands::set_networks
            ])
            .system_tray(tray)
            .on_system_tray_event(on_system_tray_event)
            .build(tauri::generate_context!())
            .expect("error while running tauri application");

        let res = Self(app);

        DB_PATH.set(res.get_db_path()).unwrap();
        SETTINGS_PATH.set(res.get_settings_file()).unwrap();

        res
    }

    pub fn manage(&self, ctx: Context) {
        self.0.manage(ctx);
    }

    pub fn run(self) {
        self.0.run(|_, event| match event {
            // close to system tray
            tauri::RunEvent::ExitRequested { api, .. } => {
                api.prevent_exit();
            }
            _ => {}
        });
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
    fn get_resource(&self, name: &str) -> PathBuf {
        self.0
            .path_resolver()
            .resolve_resource(name)
            .expect("failed to resource resource")
            .clone()
    }

    fn get_db_path(&self) -> PathBuf {
        self.get_resource("db.sqlite3")
    }

    fn get_settings_file(&self) -> PathBuf {
        self.get_resource("settings.json")
    }
}

fn on_system_tray_event(app: &AppHandle, event: SystemTrayEvent) {
    use SystemTrayEvent::*;

    match event {
        MenuItemClick { id, .. } => match id.as_str() {
            // here `"quit".to_string()` defines the menu item id, and the second parameter
            // is the menu item label.
            "quit" => app.exit(0),
            "hide" => app.get_window("main").unwrap().hide().unwrap(),
            "show" => show_main_window(app),
            _ => {}
        },

        DoubleClick { .. } => show_main_window(app),

        _ => {}
    }
}

fn show_main_window(app: &AppHandle) {
    if let Some(w) = app.get_window("main") {
        w.show().unwrap()
    } else {
        tauri::WindowBuilder::new(app, "main", tauri::WindowUrl::App("index.html".into()))
            .build()
            .unwrap();
    }
}
