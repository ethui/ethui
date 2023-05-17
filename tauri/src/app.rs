use std::path::PathBuf;

use once_cell::sync::OnceCell;
use serde::Serialize;
use tauri::{
    AppHandle, Builder, CustomMenuItem, GlobalWindowEvent, Manager, SystemTray, SystemTrayEvent,
    SystemTrayMenu, SystemTrayMenuItem, WindowEvent,
};
use tauri_plugin_window_state::{AppHandleExt, Builder as windowStatePlugin, StateFlags};
use tokio::sync::mpsc;

use crate::{commands, context::Context, dialogs};

pub struct IronApp {
    pub sender: mpsc::UnboundedSender<IronEvent>,
    app: Option<tauri::App>,
}

#[derive(Debug, Serialize, Clone)]
pub enum IronEvent {
    Window(IronWindowEvent),

    OpenDialog(u64, String, serde_json::Value),
}

#[derive(Debug, Serialize, Clone)]
pub enum IronWindowEvent {
    NetworkChanged,
    TxsUpdated,
    ConnectionsUpdated,
}

impl IronWindowEvent {
    fn label(&self) -> &str {
        match self {
            Self::NetworkChanged => "network-changed",
            Self::TxsUpdated => "txs-updated",
            Self::ConnectionsUpdated => "connections-updated",
        }
    }
}

pub static DB_PATH: OnceCell<PathBuf> = OnceCell::new();
pub static SETTINGS_PATH: OnceCell<PathBuf> = OnceCell::new();

impl IronApp {
    pub fn build() -> Self {
        let (snd, rcv) = mpsc::unbounded_channel();

        let tray = Self::build_tray();
        let mut builder = Builder::default()
            .plugin(windowStatePlugin::default().build())
            .invoke_handler(tauri::generate_handler![
                commands::get_networks,
                commands::get_current_network,
                commands::set_current_network,
                commands::get_wallet,
                commands::set_wallet,
                commands::get_current_address,
                commands::set_networks,
                commands::get_transactions,
                commands::get_contracts,
                commands::get_erc20_balances,
                commands::get_connections,
                commands::derive_addresses,
                commands::derive_addresses_with_mnemonic,
                dialogs::dialog_finish,
            ])
            .setup(|app| {
                let handle = app.handle();

                tauri::async_runtime::spawn(async move {
                    event_listener(handle, rcv).await;
                });

                #[cfg(feature = "debug")]
                if std::env::var("IRON_OPEN_DEVTOOLS").is_ok() {
                    let window = app.get_window("main").unwrap();
                    window.open_devtools();
                }

                Ok(())
            })
            .on_window_event(on_window_event);

        #[cfg(not(target_os = "macos"))]
        {
            builder = builder
                .system_tray(tray)
                .on_system_tray_event(on_system_tray_event);
        }

        let app = builder
            .build(tauri::generate_context!())
            .expect("error while running tauri application");

        let res = Self {
            app: Some(app),
            sender: snd.clone(),
        };

        DB_PATH.set(res.get_db_path()).unwrap();
        SETTINGS_PATH.set(res.get_settings_file()).unwrap();
        dialogs::init(snd.clone());

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

fn on_window_event(event: GlobalWindowEvent) {
    if let WindowEvent::CloseRequested { api, .. } = event.event() {
        let window = event.window();
        let app = window.app_handle();
        let _ = app.save_window_state(StateFlags::all());

        #[cfg(target_os = "macos")]
        {
            app.hide().unwrap();
            api.prevent_close();
        }
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
    while let Some(msg) = rcv.recv().await {
        use IronEvent::*;

        match msg {
            Window(msg) => {
                // forward directly to main window
                // if window is not open, just ignore them
                if let Some(window) = handle.get_window("main") {
                    window.emit(msg.label(), &msg).unwrap();
                }
            }

            OpenDialog(id, dialog_type, data) => {
                dialogs::open_with_handle(&handle, dialog_type, id, data).unwrap();
            }
        }
    }
}
