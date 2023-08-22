use std::path::PathBuf;

use iron_broadcast::UIMsg;
use iron_db::DB;
use iron_types::ui_events;
#[cfg(not(target_os = "linux"))]
use tauri::{AboutMetadata, Menu, MenuItem, Submenu, WindowMenuEvent};
use tauri::{
    AppHandle, Builder, CustomMenuItem, GlobalWindowEvent, Manager, SystemTray, SystemTrayEvent,
    SystemTrayMenu, SystemTrayMenuItem, WindowBuilder, WindowEvent, WindowUrl,
};
use tauri_plugin_window_state::{AppHandleExt, Builder as windowStatePlugin, StateFlags};

use crate::{commands, error::AppResult};

pub struct IronApp {
    app: tauri::App,
}

impl IronApp {
    pub async fn build() -> AppResult<Self> {
        let tray = Self::build_tray();

        let mut builder = Builder::default()
            .plugin(windowStatePlugin::default().build())
            .invoke_handler(tauri::generate_handler![
                commands::get_build_mode,
                iron_settings::commands::settings_get,
                iron_settings::commands::settings_set,
                iron_settings::commands::settings_set_dark_mode,
                iron_settings::commands::settings_finish_onboarding,
                iron_settings::commands::settings_set_alias,
                iron_settings::commands::settings_get_alias,
                iron_networks::commands::networks_get_list,
                iron_networks::commands::networks_get_current,
                iron_networks::commands::networks_set_list,
                iron_networks::commands::networks_set_current,
                iron_networks::commands::networks_reset,
                iron_db::commands::db_get_transactions,
                iron_db::commands::db_get_contracts,
                iron_db::commands::db_get_erc20_balances,
                iron_db::commands::db_get_native_balance,
                iron_ws::commands::ws_get_all_peers,
                iron_wallets::commands::wallets_get_all,
                iron_wallets::commands::wallets_get_current,
                iron_wallets::commands::wallets_get_current_address,
                iron_wallets::commands::wallets_create,
                iron_wallets::commands::wallets_update,
                iron_wallets::commands::wallets_remove,
                iron_wallets::commands::wallets_set_current_wallet,
                iron_wallets::commands::wallets_set_current_path,
                iron_wallets::commands::wallets_get_wallet_addresses,
                iron_wallets::commands::wallets_get_mnemonic_addresses,
                iron_dialogs::commands::dialog_get_payload,
                iron_dialogs::commands::dialog_send,
                iron_dialogs::commands::dialog_finish,
                iron_forge::commands::foundry_get_abi,
                iron_rpc::commands::rpc_send_transaction,
            ])
            .setup(|app| {
                let handle = app.handle();

                tauri::async_runtime::spawn(async move {
                    event_listener(handle).await;
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

        let db = DB::connect(&resource(&app, "db.sqlite3")).await?;
        init(&app, &db).await?;

        app.manage(db);
        let res = Self { app };

        Ok(res)
    }

    pub fn run(self) {
        self.app.run(|_, event| {
            if let tauri::RunEvent::ExitRequested { api, .. } = event {
                api.prevent_exit();
            }
        });
    }

    #[cfg(not(target_os = "linux"))]
    fn build_menu() -> Menu {
        let mut menu = Menu::new();

        // app submenu
        #[cfg(target_os = "macos")]
        {
            let app_name = "Iron";

            menu = menu.add_submenu(Submenu::new(
                app_name,
                Menu::new()
                    .add_native_item(MenuItem::About(
                        app_name.to_string(),
                        AboutMetadata::default(),
                    ))
                    .add_native_item(MenuItem::Separator)
                    .add_item(
                        CustomMenuItem::new("settings".to_string(), "Settings...")
                            .accelerator("CmdOrCtrl+Comma"),
                    )
                    .add_native_item(MenuItem::Separator)
                    .add_native_item(MenuItem::Services)
                    .add_native_item(MenuItem::Separator)
                    .add_native_item(MenuItem::Hide)
                    .add_native_item(MenuItem::HideOthers)
                    .add_native_item(MenuItem::ShowAll)
                    .add_native_item(MenuItem::Separator)
                    .add_native_item(MenuItem::Quit),
            ));
        }

        // file submenu
        let mut file_menu = Menu::new();
        file_menu = file_menu.add_native_item(MenuItem::CloseWindow);
        #[cfg(not(target_os = "macos"))]
        {
            file_menu = file_menu.add_native_item(MenuItem::Quit);
        }
        menu = menu.add_submenu(Submenu::new("File", file_menu));

        // edit submenu
        let mut edit_menu = Menu::new();
        #[cfg(target_os = "macos")]
        {
            edit_menu = edit_menu.add_native_item(MenuItem::Undo);
            edit_menu = edit_menu.add_native_item(MenuItem::Redo);
            edit_menu = edit_menu.add_native_item(MenuItem::Separator);
        }
        edit_menu = edit_menu.add_native_item(MenuItem::Cut);
        edit_menu = edit_menu.add_native_item(MenuItem::Copy);
        edit_menu = edit_menu.add_native_item(MenuItem::Paste);
        #[cfg(target_os = "macos")]
        {
            edit_menu = edit_menu.add_native_item(MenuItem::SelectAll);
        }
        menu = menu.add_submenu(Submenu::new("Edit", edit_menu));

        // view submenu
        #[cfg(target_os = "macos")]
        {
            menu = menu.add_submenu(Submenu::new(
                "View",
                Menu::new().add_native_item(MenuItem::EnterFullScreen),
            ));
        }

        // go submenu
        let balances = CustomMenuItem::new("balances".to_string(), "Balances");
        let transactions = CustomMenuItem::new("transactions".to_string(), "Transactions");
        let contracts = CustomMenuItem::new("contracts".to_string(), "Contracts");
        let connections = CustomMenuItem::new("connections".to_string(), "Connections");
        let go_submenu = Submenu::new(
            "Go",
            Menu::new()
                .add_item(transactions)
                .add_item(balances)
                .add_item(contracts)
                .add_item(connections),
        );

        menu = menu.add_submenu(go_submenu);

        // window submenu
        let mut window_menu = Menu::new();
        window_menu = window_menu.add_native_item(MenuItem::Minimize);
        #[cfg(target_os = "macos")]
        {
            window_menu = window_menu.add_native_item(MenuItem::Zoom);
            window_menu = window_menu.add_native_item(MenuItem::Separator);
        }
        window_menu = window_menu.add_native_item(MenuItem::CloseWindow);
        menu.add_submenu(Submenu::new("Window", window_menu))
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
        "settings" => {
            event.window().emit("menu:settings", ()).unwrap();
        }
        path => {
            event.window().emit("go", path).unwrap();
        }
    }
}

async fn init(app: &tauri::App, db: &DB) -> AppResult<()> {
    // anvil needs to be started before networks, otherwise the initial tracker won't be ready to
    // spawn
    iron_sync::init(db.clone()).await;

    iron_settings::init(resource(app, "settings.json")).await;
    iron_ws::init();
    iron_wallets::init(resource(app, "wallets.json")).await;
    iron_networks::init(resource(app, "networks.json")).await;
    iron_forge::init().await?;

    Ok(())
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

async fn event_listener(handle: AppHandle) {
    let mut rx = iron_broadcast::subscribe_ui().await;

    loop {
        if let Ok(msg) = rx.recv().await {
            use UIMsg::*;

            match msg {
                Notify(msg) => {
                    // forward directly to main window
                    // if window is not open, just ignore them
                    if let Some(window) = handle.get_window("main") {
                        window.emit(msg.label(), &msg).unwrap();
                    }
                }

                DialogOpen(ui_events::DialogOpen {
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

                DialogClose(ui_events::DialogClose { label }) => {
                    if let Some(window) = handle.get_window(&label) {
                        window.close().unwrap();
                    }
                }

                DialogSend(ui_events::DialogSend {
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
}

fn resource(app: &tauri::App, resource: &str) -> PathBuf {
    app.path_resolver()
        .resolve_resource(resource)
        .unwrap_or_else(|| panic!("failed to resolve resource {}", resource))
}
