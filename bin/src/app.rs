use std::path::PathBuf;

use ethui_args::Args;
use ethui_broadcast::UIMsg;
use named_lock::NamedLock;
use tauri::{AppHandle, Builder, Emitter as _, Manager as _};
use tauri_plugin_aptabase::EventTracker;

#[cfg(all(feature = "updater", any(debug_assertions, target_os = "macos")))]
use crate::updater;
use crate::{commands, menu, system_tray, windows};

#[cfg(not(debug_assertions))]
static LOCK_NAME: &str = "ethui";
#[cfg(all(debug_assertions, not(feature = "test")))]
static LOCK_NAME: &str = "ethui-dev";
#[cfg(all(debug_assertions, feature = "test"))]
static LOCK_NAME: &str = "ethui-test";

pub struct EthUIApp {
    app: tauri::App,
    hidden: bool,
}

impl EthUIApp {
    pub async fn start_or_open(args: ethui_args::Args) -> color_eyre::Result<()> {
        let lock = NamedLock::create(LOCK_NAME)?;

        let _guard = match lock.try_lock() {
            Ok(g) => g,
            Err(_) => {
                ethui_broadcast::main_window_show().await;
                return Ok(());
            }
        };
        Self::build(args).await?.run().await;
        Ok(())
    }

    pub async fn build(args: ethui_args::Args) -> color_eyre::Result<Self> {
        let builder = Builder::default();

        let builder = builder
            .invoke_handler(tauri::generate_handler![
                commands::get_build_mode,
                commands::get_version,
                commands::ui_error,
                commands::add_contract,
                commands::remove_contract,
                commands::is_stacks_enabled,
                #[cfg(feature = "stacks")]
                ethui_stacks::commands::stacks_create,
                #[cfg(feature = "stacks")]
                ethui_stacks::commands::stacks_list,
                #[cfg(feature = "stacks")]
                ethui_stacks::commands::stacks_get_status,
                #[cfg(feature = "stacks")]
                ethui_stacks::commands::stacks_remove,
                #[cfg(feature = "stacks")]
                ethui_stacks::commands::stacks_shutdown,
                #[cfg(feature = "stacks")]
                ethui_stacks::commands::stacks_get_runtime_state,
                ethui_settings::commands::settings_get,
                ethui_settings::commands::settings_set,
                ethui_settings::commands::settings_set_dark_mode,
                ethui_settings::commands::settings_set_fast_mode,
                ethui_settings::commands::settings_finish_onboarding,
                ethui_settings::commands::settings_set_alias,
                ethui_settings::commands::settings_get_alias,
                ethui_settings::commands::settings_onboarding_finish_step,
                ethui_settings::commands::settings_onboarding_finish_all,
                ethui_settings::commands::settings_set_run_local_stacks,
                ethui_networks::commands::networks_get_list,
                ethui_networks::commands::networks_get_current,
                ethui_networks::commands::networks_set_current,
                ethui_networks::commands::networks_add,
                ethui_networks::commands::networks_update,
                ethui_networks::commands::networks_remove,
                ethui_networks::commands::networks_is_dev,
                ethui_networks::commands::networks_chain_id_from_provider,
                ethui_db::commands::db_get_contracts,
                ethui_db::commands::db_get_newer_transactions,
                ethui_db::commands::db_get_older_transactions,
                ethui_db::commands::db_get_latest_transactions,
                ethui_db::commands::db_get_transaction_by_hash,
                ethui_db::commands::db_get_contract_abi,
                ethui_db::commands::db_get_contract_impl_abi,
                ethui_db::commands::db_get_contract_addresses,
                ethui_db::commands::db_get_transaction_addresses,
                ethui_db::commands::db_get_erc20_metadata,
                ethui_db::commands::db_get_erc20_balances,
                ethui_db::commands::db_get_erc20_blacklist,
                ethui_db::commands::db_set_erc20_blacklist,
                ethui_db::commands::db_clear_erc20_blacklist,
                ethui_db::commands::db_get_native_balance,
                ethui_db::commands::db_get_erc721_tokens,
                ethui_forge::commands::fetch_forge_abis,
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
                ethui_rpc::commands::rpc_get_code,
                ethui_rpc::commands::rpc_is_contract,
                ethui_connections::commands::connections_affinity_for,
                ethui_connections::commands::connections_set_affinity,
                ethui_sync::commands::sync_alchemy_is_network_supported,
                ethui_sync::commands::sync_get_native_balance,
                ethui_simulator::commands::simulator_run,
                ethui_simulator::commands::simulator_get_call_count,
            ])
            .plugin(tauri_plugin_os::init())
            .plugin(tauri_plugin_clipboard_manager::init())
            .plugin(tauri_plugin_shell::init());

        #[cfg(feature = "aptabase")]
        let builder =
            builder.plugin(tauri_plugin_aptabase::Builder::new(std::env!("APTABASE_KEY")).build());

        #[cfg(all(feature = "updater", any(debug_assertions, target_os = "macos")))]
        let builder = builder
            .plugin(tauri_plugin_updater::Builder::new().build())
            .plugin(tauri_plugin_process::init());

        let builder = builder.setup(|app| {
            let handle = app.handle();
            let _ = menu::build(handle);
            let _ = system_tray::build(handle);

            #[cfg(all(feature = "updater", any(debug_assertions, target_os = "macos")))]
            updater::spawn(handle.clone());
            Ok(())
        });

        let app = builder.build(tauri::generate_context!())?;

        init(&app, &args).await?;

        Ok(Self {
            app,
            hidden: args.hidden,
        })
    }

    pub async fn run(self) {
        let settings = ethui_settings::ask(ethui_settings::GetAll).await;
        let start_minimized = settings.map(|s| s.start_minimized).unwrap_or(false);
        if !self.hidden && !start_minimized {
            windows::main::show(self.app.handle()).await;
        }

        self.app.run(|handle, event| match event {
            tauri::RunEvent::ExitRequested { code, api, .. } => {
                // code == None seems to happen when the window is closed,
                // in which case we don't want to close the app, but keep it running in
                // background & tray
                if code.is_none() {
                    api.prevent_exit();
                }
            }

            tauri::RunEvent::Exit => {
                let _ = ethui_analytics::track_event(handle, "app_exited", None);
                #[cfg(feature = "aptabase")]
                let _ = handle.track_event("app_exited", None);

                #[cfg(feature = "stacks")]
                {
                    tokio::task::block_in_place(|| {
                        tokio::runtime::Handle::current().block_on(async {
                            let _ = ethui_stacks::actor::ask(ethui_stacks::actor::Shutdown()).await;
                        });
                    });
                }
            }

            #[cfg(target_os = "macos")]
            tauri::RunEvent::Reopen { .. } => {
                let handle = handle.clone();
                tokio::spawn(async move { windows::all_windows_focus(&handle).await });
            }
            _ => (),
        });
    }
}

/// Initialization logic
async fn init(app: &tauri::App, args: &Args) -> color_eyre::Result<()> {
    let db = ethui_db::init(&resource(app, "db.sqlite3", args)).await?;
    app.manage(db.clone());

    // set up app's event listener
    let handle = app.handle().clone();
    tauri::async_runtime::spawn(async move {
        event_listener(handle).await;
    });

    // calls other crates' initialization logic. anvil needs to be started before networks,
    // otherwise the initial tracker won't be ready to spawn
    ethui_sync::init().await;
    ethui_settings::init(resource(app, "settings.json", args)).await?;
    ethui_ws::init(args).await;
    ethui_connections::init(resource(app, "connections.json", args)).await;
    ethui_wallets::init(resource(app, "wallets.json", args)).await;
    ethui_networks::init(resource(app, "networks.json", args)).await;
    ethui_forge::init().await?;
    ethui_analytics::init(app.handle()).await;

    ethui_analytics::track_event(app.handle(), "app_started", None)?;

    #[cfg(feature = "stacks")]
    ethui_stacks::init(args.stacks_port, resource(app, "stacks/", args)).await?;

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

                DialogOpen(params) => windows::dialogs::open(&handle, params),
                DialogClose(params) => windows::dialogs::close(&handle, params),
                DialogSend(params) => windows::dialogs::send(&handle, params),

                MainWindowShow => windows::main::show(&handle).await,
                MainWindowHide => windows::main::hide(&handle),
            }
        }
    }
}

/// Returns the resource path for the given resource.
/// If the `ETHUI_CONFIG_DIR` env var is set, it will be used as the base path.
/// Otherwise, the app's default config dir will be used.
fn resource(app: &tauri::App, resource: &str, args: &Args) -> PathBuf {
    let dir = config_dir(app, args);
    std::fs::create_dir_all(&dir).expect("could not create config dir");
    dir.join(resource)
}

#[cfg(debug_assertions)]
fn config_dir(_app: &tauri::App, args: &Args) -> PathBuf {
    let path = args
        .config_dir
        .clone()
        .unwrap_or(String::from("../dev-data/default"));

    PathBuf::from(path)
}

#[cfg(not(debug_assertions))]
fn config_dir(app: &tauri::App, args: &Args) -> PathBuf {
    args.config_dir
        .clone()
        .map(PathBuf::from)
        .unwrap_or_else(|| {
            app.path()
                .app_config_dir()
                .expect("failed to resolve app_config_dir")
        })
}
