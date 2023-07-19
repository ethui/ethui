use std::path::PathBuf;

use iron_core::app::Event;
use tauri::{
    AppHandle, Builder, CustomMenuItem, GlobalWindowEvent, Manager, SystemTray, SystemTrayEvent,
    SystemTrayMenu, SystemTrayMenuItem, WindowBuilder, WindowEvent, WindowUrl,
};
#[cfg(not(target_os = "linux"))]
use tauri::{Menu, Submenu, WindowMenuEvent};
use tauri_plugin_window_state::{AppHandleExt, Builder as windowStatePlugin, StateFlags};
use tokio::sync::mpsc;

use iron_core::{alchemy, dialogs, foundry, networks, peers, rpc, settings, wallets};
use iron_db::DB;

pub struct IronApp {
    pub sender: mpsc::UnboundedSender<Event>,
    app: Option<tauri::App>,
}

impl IronApp {
    pub fn build() -> Self {
        let (snd, rcv) = mpsc::unbounded_channel();

        let tray = Self::build_tray();

        let mut builder = Builder::default()
            .plugin(windowStatePlugin::default().build())
            .invoke_handler(tauri::generate_handler![
                settings::commands::settings_get,
                settings::commands::settings_set,
                settings::commands::settings_set_dark_mode,
                settings::commands::settings_set_alias,
                settings::commands::settings_get_alias,
                networks::commands::networks_get_list,
                networks::commands::networks_get_current,
                networks::commands::networks_set_list,
                networks::commands::networks_set_current,
                networks::commands::networks_reset,
                iron_db::commands::db_get_transactions,
                iron_db::commands::db_get_contracts,
                iron_db::commands::db_get_erc20_balances,
                iron_db::commands::db_get_native_balance,
                peers::commands::peers_get_all,
                wallets::commands::wallets_get_all,
                wallets::commands::wallets_get_current,
                wallets::commands::wallets_get_current_address,
                wallets::commands::wallets_set_list,
                wallets::commands::wallets_create,
                wallets::commands::wallets_update,
                wallets::commands::wallets_remove,
                wallets::commands::wallets_set_current_wallet,
                wallets::commands::wallets_set_current_path,
                wallets::commands::wallets_get_wallet_addresses,
                wallets::commands::wallets_get_mnemonic_addresses,
                dialogs::commands::dialog_get_payload,
                dialogs::commands::dialog_send,
                dialogs::commands::dialog_finish,
                foundry::commands::foundry_get_abi,
                alchemy::commands::alchemy_fetch_erc20_balances,
                alchemy::commands::alchemy_fetch_native_balance,
                alchemy::commands::alchemy_fetch_transactions,
                rpc::commands::rpc_send_transaction,
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

        #[cfg(not(target_os = "linux"))]
        {
            let menu = Self::build_menu();
            builder = builder.menu(menu).on_menu_event(on_menu_event)
        }

        let app = builder
            .build(tauri::generate_context!())
            .expect("error while running tauri application");

        let res = Self {
            app: Some(app),
            sender: snd.clone(),
        };

        iron_core::app::SETTINGS_PATH
            .set(res.get_resource_path("settings.json"))
            .unwrap();
        iron_core::app::APP_SND.set(snd).unwrap();

        res
    }

    pub fn get_resource_path(&self, name: &str) -> PathBuf {
        self.app
            .as_ref()
            .unwrap()
            .path_resolver()
            .resolve_resource(name)
            .expect("failed to resource resource")
    }

    pub fn manage(&self, db: DB) {
        let app = self.app.as_ref().unwrap();
        app.manage(db);
    }

    pub fn run(&mut self) {
        self.app.take().unwrap().run(|_, event| {
            if let tauri::RunEvent::ExitRequested { api, .. } = event {
                api.prevent_exit();
            }
        });
    }

    #[cfg(not(target_os = "linux"))]
    fn build_menu() -> Menu {
        let details = CustomMenuItem::new("details".to_string(), "Details");
        let transactions = CustomMenuItem::new("transactions".to_string(), "Transactions");
        let balances = CustomMenuItem::new("balances".to_string(), "Balances");
        let contracts = CustomMenuItem::new("contracts".to_string(), "Contracts");
        let connections = CustomMenuItem::new("connections".to_string(), "Connections");
        let go_submenu = Submenu::new(
            "Go",
            Menu::new()
                .add_item(details)
                .add_item(transactions)
                .add_item(balances)
                .add_item(contracts)
                .add_item(connections),
        );

        Menu::os_default("Iron").add_submenu(go_submenu)
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

#[cfg(not(target_os = "linux"))]
fn on_menu_event(event: WindowMenuEvent) {
    match event.menu_item_id() {
        "quit" => {
            std::process::exit(0);
        }
        "close" => {
            event.window().close().unwrap();
        }
        path => {
            event.window().emit("go", path).unwrap();
        }
    }
}

fn on_window_event(event: GlobalWindowEvent) {
    if let WindowEvent::CloseRequested {
        #[cfg(not(target_os = "linux"))]
        api,
        ..
    } = event.event()
    {
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

async fn event_listener(handle: AppHandle, mut rcv: mpsc::UnboundedReceiver<Event>) {
    while let Some(msg) = rcv.recv().await {
        use Event::*;

        match msg {
            Notify(msg) => {
                // forward directly to main window
                // if window is not open, just ignore them
                if let Some(window) = handle.get_window("main") {
                    window.emit(msg.label(), &msg).unwrap();
                }
            }

            DialogOpen(dialogs::DialogOpenParams {
                label,
                title,
                url,
                w,
                h,
            }) => {
                WindowBuilder::new(&handle, label, WindowUrl::App(url.into()))
                    .min_inner_size(w, h)
                    .max_inner_size(w, h)
                    .title(title)
                    .build()
                    .unwrap();
            }

            DialogClose(dialogs::DialogCloseParams { label }) => {
                if let Some(window) = handle.get_window(&label) {
                    window.close().unwrap();
                }
            }

            DialogSend(dialogs::DialogSend {
                label,
                event_type,
                payload,
            }) => {
                handle
                    .get_window(&label)
                    .unwrap()
                    .emit(&event_type, &payload)
                    .unwrap();
            }
        }
    }
}
