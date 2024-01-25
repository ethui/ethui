use std::path::PathBuf;

use iron_args::Args;
use iron_broadcast::UIMsg;
use iron_db::DB;
#[cfg(target_os = "macos")]
use tauri::WindowEvent;
use tauri::{AppHandle, Builder, GlobalShortcutManager, GlobalWindowEvent, Manager};
use tauri_plugin_window_state::Builder as windowStatePlugin;

use crate::{
    commands, dialogs,
    error::AppResult,
    menu, system_tray,
    utils::{main_window_hide, main_window_show},
};

pub struct IronApp {
    app: tauri::App,
}

impl IronApp {
    pub async fn build(args: &iron_args::Args) -> AppResult<Self> {
        let builder = Builder::default()
            .plugin(windowStatePlugin::default().build())
            .invoke_handler(tauri::generate_handler![
                commands::get_build_mode,
                commands::get_version,
                commands::get_contract_name,
                commands::get_contract_abi,
                commands::ui_error,
                iron_settings::commands::settings_get,
                iron_settings::commands::settings_set,
                iron_settings::commands::settings_set_dark_mode,
                iron_settings::commands::settings_set_fast_mode,
                iron_settings::commands::settings_finish_onboarding,
                iron_settings::commands::settings_set_alias,
                iron_settings::commands::settings_get_alias,
                iron_settings::commands::settings_test_alchemy_api_key,
                iron_settings::commands::settings_test_etherscan_api_key,
                iron_networks::commands::networks_get_list,
                iron_networks::commands::networks_get_current,
                iron_networks::commands::networks_set_list,
                iron_networks::commands::networks_set_current,
                iron_networks::commands::networks_reset,
                iron_db::commands::db_get_contracts,
                iron_db::commands::db_insert_contract,
                iron_db::commands::db_get_transactions,
                iron_db::commands::db_get_contracts,
                iron_db::commands::db_get_erc20_metadata,
                iron_db::commands::db_get_erc20_balances,
                iron_db::commands::db_get_native_balance,
                iron_db::commands::db_get_erc721_tokens,
                iron_ws::commands::ws_peers_by_domain,
                iron_ws::commands::ws_peer_count,
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
                iron_wallets::commands::wallets_validate_mnemonic,
                iron_wallets::commands::wallets_ledger_derive,
                iron_dialogs::commands::dialog_get_payload,
                iron_dialogs::commands::dialog_send,
                iron_forge::commands::forge_get_abi,
                iron_rpc::commands::rpc_send_transaction,
                iron_connections::commands::connections_affinity_for,
                iron_connections::commands::connections_set_affinity,
                iron_sync::commands::sync_alchemy_is_network_supported,
                iron_sync::commands::sync_get_native_balance,
                iron_simulator::commands::simulator_run
            ])
            .on_window_event(on_window_event)
            .menu(menu::build())
            .on_menu_event(menu::event_handler);

        let builder = builder
            .system_tray(system_tray::build())
            .on_system_tray_event(system_tray::event_handler);

        let app = builder
            .build(tauri::generate_context!())
            .expect("error while running tauri application");

        init(&app, args).await?;

        if !args.hidden {
            main_window_show(&app.handle()).await;
        }

        Ok(Self { app })
    }

    pub fn run(self) {
        self.app.run(|app_handle, e| match e {
            tauri::RunEvent::Ready => {
                let app_handle = app_handle.clone();

                let _ = app_handle
                    .global_shortcut_manager()
                    .register("CmdOrCtrl+1", move || {
                        println!("rfvdfvdv");
                        let app_handle = app_handle.clone();
                        app_handle
                            .get_window("main")
                            .unwrap()
                            .show()
                            .expect("error")
                    });
            }
            tauri::RunEvent::ExitRequested { api, .. } => {
                api.prevent_exit();
            }
            _ => (),
        })
    }
}

/// Initialization logic
async fn init(app: &tauri::App, args: &Args) -> AppResult<()> {
    let db = DB::connect(&resource(app, "db.sqlite3")).await?;
    app.manage(db.clone());

    // set up app's event listener
    let handle = app.handle();
    tauri::async_runtime::spawn(async move {
        event_listener(handle).await;
    });

    // calls other crates' initialization logic. anvil needs to be started before networks,
    // otherwise the initial tracker won't be ready to spawn
    iron_sync::init(db.clone()).await;
    iron_settings::init(resource(app, "settings.json")).await?;
    iron_ws::init(args).await;
    iron_http::init(args, db).await;
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

#[cfg(target_os = "macos")]
fn on_window_event(event: GlobalWindowEvent) {
    if let WindowEvent::CloseRequested { api, .. } = event.event() {
        {
            let app = event.window().app_handle();
            app.hide().unwrap();
            api.prevent_close();
        }
    }
}

#[cfg(not(target_os = "macos"))]
fn on_window_event(_event: GlobalWindowEvent) {}

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

                DialogOpen(params) => dialogs::open(&handle, params),
                DialogClose(params) => dialogs::close(&handle, params),
                DialogSend(params) => dialogs::send(&handle, params),

                MainWindowShow => main_window_show(&handle).await,
                MainWindowHide => main_window_hide(&handle),
            }
        }
    }
}

/// Returns the resource path for the given resource.
/// If the `IRON_CONFIG_DIR` env var is set, it will be used as the base path.
/// Otherwise, the app's default config dir will be used.
fn resource(app: &tauri::App, resource: &str) -> PathBuf {
    let dir = config_dir(app);
    std::fs::create_dir_all(&dir).expect("could not create config dir");
    dir.join(resource)
}

#[cfg(debug_assertions)]
fn config_dir(_app: &tauri::App) -> PathBuf {
    PathBuf::from("../../target/debug/")
}

#[cfg(not(debug_assertions))]
fn config_dir(app: &tauri::App) -> PathBuf {
    app.path_resolver()
        .app_config_dir()
        .expect("failed to resolve app_config_dir")
}
