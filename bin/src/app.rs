use std::path::PathBuf;

use ethui_args::Args;
use ethui_broadcast::UIMsg;
#[cfg(target_os = "macos")]
use tauri::WindowEvent;
use tauri::{AppHandle, Builder, Manager as _};
use tracing::debug;

use crate::{
    commands, dialogs,
    error::AppResult,
    menu, system_tray,
    utils::{main_window_hide, main_window_show},
};

pub struct EthUIApp {
    app: tauri::App,
}

impl EthUIApp {
    pub async fn build(args: &ethui_args::Args) -> AppResult<Self> {
        let builder = Builder::default()
            .invoke_handler(tauri::generate_handler![
                commands::get_build_mode,
                commands::get_version,
                commands::ui_error,
                ethui_settings::commands::settings_get,
                ethui_settings::commands::settings_set,
                ethui_settings::commands::settings_set_dark_mode,
                ethui_settings::commands::settings_set_fast_mode,
                ethui_settings::commands::settings_finish_onboarding,
                ethui_settings::commands::settings_set_alias,
                ethui_settings::commands::settings_get_alias,
                ethui_settings::commands::settings_test_alchemy_api_key,
                ethui_settings::commands::settings_test_etherscan_api_key,
                ethui_networks::commands::networks_get_list,
                ethui_networks::commands::networks_get_current,
                ethui_networks::commands::networks_set_list,
                ethui_networks::commands::networks_set_current,
                ethui_networks::commands::networks_reset,
                ethui_db::commands::db_get_contracts,
                ethui_db::commands::db_insert_contract,
                ethui_db::commands::db_get_transactions,
                ethui_db::commands::db_get_transaction_by_hash,
                ethui_db::commands::db_get_contract_abi,
                ethui_db::commands::db_get_erc20_metadata,
                ethui_db::commands::db_get_erc20_balances,
                ethui_db::commands::db_set_erc20_blacklist,
                ethui_db::commands::db_get_native_balance,
                ethui_db::commands::db_get_erc721_tokens,
                ethui_ws::commands::ws_peers_by_domain,
                ethui_ws::commands::ws_peer_count,
                ethui_wallets::commands::wallets_get_all,
                ethui_wallets::commands::wallets_get_current,
                ethui_wallets::commands::wallets_get_current_address,
                ethui_wallets::commands::wallets_create,
                ethui_wallets::commands::wallets_update,
                ethui_wallets::commands::wallets_remove,
                ethui_wallets::commands::wallets_set_current_wallet,
                ethui_wallets::commands::wallets_set_current_path,
                ethui_wallets::commands::wallets_get_wallet_addresses,
                ethui_wallets::commands::wallets_get_mnemonic_addresses,
                ethui_wallets::commands::wallets_validate_mnemonic,
                ethui_wallets::commands::wallets_ledger_derive,
                ethui_dialogs::commands::dialog_get_payload,
                ethui_dialogs::commands::dialog_send,
                ethui_rpc::commands::rpc_send_transaction,
                ethui_rpc::commands::rpc_eth_call,
                ethui_connections::commands::connections_affinity_for,
                ethui_connections::commands::connections_set_affinity,
                ethui_sync::commands::sync_alchemy_is_network_supported,
                ethui_sync::commands::sync_get_native_balance,
                ethui_simulator::commands::simulator_run,
                ethui_simulator::commands::simulator_get_call_count,
                ethui_abis::commands::abi_parse_argument,
            ])
            .plugin(tauri_plugin_os::init())
            .setup(|app| {
                let handle = app.handle();
                let _ = menu::build(handle);
                let _ = system_tray::build(handle);
                Ok(())
            });

        let app = builder.build(tauri::generate_context!())?;

        init(&app, args).await?;

        if !args.hidden {
            main_window_show(app.handle()).await;
        }

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
async fn init(app: &tauri::App, args: &Args) -> AppResult<()> {
    let db = ethui_db::init(&resource(app, "db.sqlite3")).await?;
    app.manage(db.clone());

    // set up app's event listener
    let handle = app.handle().clone();
    tauri::async_runtime::spawn(async move {
        event_listener(handle).await;
    });

    // calls other crates' initialization logic. anvil needs to be started before networks,
    // otherwise the initial tracker won't be ready to spawn
    ethui_sync::init().await;
    ethui_settings::init(resource(app, "settings.json")).await?;
    ethui_ws::init(args).await;
    ethui_http::init(args, db).await;
    ethui_connections::init(resource(app, "connections.json")).await;
    ethui_wallets::init(resource(app, "wallets.json")).await;
    ethui_networks::init(resource(app, "networks.json")).await;
    ethui_forge::init().await?;

    // automatically open devtools if env asks for it
    #[cfg(feature = "debug")]
    if std::env::var("ethui_OPEN_DEVTOOLS").is_ok() {
        let window = app.get_webview_window("main").unwrap();
        window.open_devtools();
    }

    Ok(())
}

async fn event_listener(handle: AppHandle) {
    let mut rx = ethui_broadcast::subscribe_ui().await;

    loop {
        if let Ok(msg) = rx.recv().await {
            use UIMsg::*;

            match msg {
                Notify(msg) => {
                    // forward directly to main window
                    // if window is not open, just ignore them
                    if let Some(window) = handle.get_webview_window("main") {
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
/// If the `ethui_CONFIG_DIR` env var is set, it will be used as the base path.
/// Otherwise, the app's default config dir will be used.
fn resource(app: &tauri::App, resource: &str) -> PathBuf {
    let dir = config_dir(app);
    debug!("config dir: {:?}", dir);
    std::fs::create_dir_all(&dir).expect("could not create config dir");
    dir.join(resource)
}

#[cfg(debug_assertions)]
fn config_dir(_app: &tauri::App) -> PathBuf {
    PathBuf::from("../dev-data/default/")
}

#[cfg(not(debug_assertions))]
fn config_dir(app: &tauri::App) -> PathBuf {
    app.path()
        .app_config_dir()
        .expect("failed to resolve app_config_dir")
}
