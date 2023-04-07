use std::{path::PathBuf, sync::OnceLock};

use log::debug;
use serde::Serialize;
use tauri::{
    AppHandle, Builder, CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu,
    SystemTrayMenuItem,
};
use tokio::sync::mpsc;

use crate::{commands, context::Context};

pub struct IronApp {
    pub sender: mpsc::UnboundedSender<IronEvent>,
    app: Option<tauri::App>,
}

#[derive(Debug, Serialize)]
pub enum IronEvent {
    RefreshNetwork,
    RefreshTransactions,
}

impl IronEvent {
    fn label(&self) -> &str {
        match self {
            Self::RefreshNetwork => "refresh-network",
            Self::RefreshTransactions => "refresh-transactions",
        }
    }
}

pub static DB_PATH: OnceLock<PathBuf> = OnceLock::new();
pub static SETTINGS_PATH: OnceLock<PathBuf> = OnceLock::new();

impl IronApp {
    pub fn build() -> Self {
        let (snd, rcv) = mpsc::unbounded_channel();

        let tray = Self::build_tray();
        let app = Builder::default()
            .invoke_handler(tauri::generate_handler![
                commands::get_networks,
                commands::get_current_network,
                commands::set_current_network,
                commands::get_wallet,
                commands::set_wallet,
                commands::set_networks,
                commands::get_transactions
            ])
            .setup(|app| {
                let handle = app.handle();

                tauri::async_runtime::spawn(async move {
                    event_listener(handle, rcv).await;
                });

                Ok(())
            })
            .system_tray(tray)
            .on_system_tray_event(on_system_tray_event)
            .build(tauri::generate_context!())
            .expect("error while running tauri application");

        let res = Self {
            app: Some(app),
            sender: snd,
        };

        DB_PATH.set(res.get_db_path()).unwrap();
        SETTINGS_PATH.set(res.get_settings_file()).unwrap();

        res
    }

    pub fn manage(&self, ctx: Context) {
        self.app.as_ref().unwrap().manage(ctx);
    }

    pub fn run(&mut self) {
        self.app.take().unwrap().run(|_, event| {
            if let tauri::RunEvent::ExitRequested { api, .. } = event {
                api.prevent_exit();
            }
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
        self.app
            .as_ref()
            .unwrap()
            .path_resolver()
            .resolve_resource(name)
            .expect("failed to resource resource")
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

async fn event_listener(handle: AppHandle, mut rcv: mpsc::UnboundedReceiver<IronEvent>) {
    while let (Some(msg), Some(window)) = (rcv.recv().await, handle.get_window("main")) {
        debug!("received event: {:?}", msg);
        window.emit(msg.label(), &msg).unwrap();
    }
}
