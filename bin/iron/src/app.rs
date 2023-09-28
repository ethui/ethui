use std::path::PathBuf;

use iron_broadcast::UIMsg;
use iron_db::DB;
use iron_types::ui_events;
use tauri::{
    AppHandle, Builder, GlobalWindowEvent, Manager, WindowBuilder, WindowEvent, WindowUrl,
};
use tauri_plugin_window_state::{AppHandleExt, Builder as windowStatePlugin, StateFlags};

use crate::{commands, error::AppResult, menu};

pub struct IronApp {
    app: tauri::App,
}

impl IronApp {
    pub async fn build() -> AppResult<Self> {
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
                iron_db::commands::db_get_contracts,
                iron_db::commands::db_insert_contract,
                iron_db::commands::db_get_transactions,
                iron_db::commands::db_get_contracts,
                iron_db::commands::db_get_erc20_balances,
                iron_db::commands::db_get_native_balance,
                iron_db::commands::db_get_erc721_tokens,
                iron_ws::commands::ws_peers_by_domain,
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
                iron_connections::commands::connections_affinity_for,
                iron_connections::commands::connections_set_affinity,
                iron_sync::commands::sync_alchemy_is_network_supported,
                iron_simulator::commands::simulator_run
            ])
            .on_window_event(on_window_event)
            .menu(menu::build())
            .on_menu_event(menu::event_handler);

        #[cfg(not(target_os = "macos"))]
        {
            builder = builder
                .system_tray(crate::system_tray::build())
                .on_system_tray_event(crate::system_tray::event_handler);
        }

        let app = builder
            .build(tauri::generate_context!())
            .expect("error while running tauri application");

        init(&app).await?;

        Ok(Self { app })
    }

    pub fn run(self) {
        self.app.run(|_, event| {
            if let tauri::RunEvent::ExitRequested { api, .. } = event {
                api.prevent_exit();
            }
        });
    }
}

/// Initialization logic
async fn init(app: &tauri::App) -> AppResult<()> {
    let db = DB::connect(&resource(app, "db.sqlite3")).await?;
    app.manage(db.clone());

    // set up app's event listener
    let handle = app.handle();
    tauri::async_runtime::spawn(async move {
        event_listener(handle).await;
    });

    // calls other crates' initialization logic. anvil needs to be started before networks,
    // otherwise the initial tracker won't be ready to spawn
    iron_sync::init(db).await;
    iron_settings::init(resource(app, "settings.json")).await;
    iron_ws::init().await;
    iron_http::init().await;
    iron_connections::init(resource(app, "connections.json")).await;
    iron_wallets::init(resource(app, "wallets.json")).await;
    iron_networks::init(resource(app, "networks.json")).await;
    iron_forge::init().await?;

    // automatically open devtools if env asks for it
    #[cfg(feature = "debug")]
    if std::env::var("IRON_OPEN_DEVTOOLS").is_ok() {
        let window = app.get_window("main").unwrap();
        window.open_devtools();
    }

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
