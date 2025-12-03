use std::path::PathBuf;

use args::Args;
use broadcast::UIMsg;
use settings::{SettingsActorExt as _, settings};
#[cfg(feature = "stacks")]
use stacks::actor::{StacksActorExt as _, try_stacks};
use named_lock::NamedLock;
use tauri::{AppHandle, Builder, Emitter as _, Manager as _};
#[cfg(feature = "aptabase")]
use tauri::{Runtime, plugin::TauriPlugin};
#[cfg(feature = "aptabase")]
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
    pub async fn start_or_open(args: args::Args) -> color_eyre::Result<()> {
        let lock = NamedLock::create(LOCK_NAME)?;

        let _guard = match lock.try_lock() {
            Ok(g) => g,
            Err(_) => {
                broadcast::main_window_show().await;
                return Ok(());
            }
        };
        Self::build(args).await?.run().await;
        Ok(())
    }

    pub async fn build(args: args::Args) -> color_eyre::Result<Self> {
        let builder = Builder::default();

        let builder = builder
            .invoke_handler(tauri::generate_handler![
                commands::get_build_mode,
                commands::get_version,
                commands::logging_get_snapshot,
                commands::ui_error,
                commands::add_contract,
                commands::remove_contract,
                commands::is_stacks_enabled,
                #[cfg(feature = "stacks")]
                stacks::commands::stacks_create,
                #[cfg(feature = "stacks")]
                stacks::commands::stacks_list,
                #[cfg(feature = "stacks")]
                stacks::commands::stacks_get_status,
                #[cfg(feature = "stacks")]
                stacks::commands::stacks_remove,
                #[cfg(feature = "stacks")]
                stacks::commands::stacks_shutdown,
                #[cfg(feature = "stacks")]
                stacks::commands::stacks_get_runtime_state,
                settings::commands::settings_get,
                settings::commands::settings_set,
                settings::commands::settings_set_dark_mode,
                settings::commands::settings_set_fast_mode,
                settings::commands::settings_finish_onboarding,
                settings::commands::settings_set_alias,
                settings::commands::settings_get_alias,
                settings::commands::settings_onboarding_finish_step,
                settings::commands::settings_onboarding_finish_all,
                settings::commands::settings_set_run_local_stacks,
                networks::commands::networks_get_list,
                networks::commands::networks_get_current,
                networks::commands::networks_set_current,
                networks::commands::networks_add,
                networks::commands::networks_update,
                networks::commands::networks_remove,
                networks::commands::networks_is_dev,
                networks::commands::networks_chain_id_from_provider,
                db::commands::db_get_contracts,
                db::commands::db_get_newer_transactions,
                db::commands::db_get_older_transactions,
                db::commands::db_get_latest_transactions,
                db::commands::db_get_transaction_by_hash,
                db::commands::db_get_contract_abi,
                db::commands::db_get_contract_impl_abi,
                db::commands::db_get_contract_addresses,
                db::commands::db_get_transaction_addresses,
                db::commands::db_get_erc20_metadata,
                db::commands::db_get_erc20_balances,
                db::commands::db_get_erc20_blacklist,
                db::commands::db_set_erc20_blacklist,
                db::commands::db_clear_erc20_blacklist,
                db::commands::db_get_native_balance,
                db::commands::db_get_erc721_tokens,
                forge::commands::fetch_forge_abis,
                ws::commands::ws_peers_by_domain,
                ws::commands::ws_peer_count,
                wallets::commands::wallets_get_all,
                wallets::commands::wallets_get_current,
                wallets::commands::wallets_get_current_address,
                wallets::commands::wallets_create,
                wallets::commands::wallets_update,
                wallets::commands::wallets_remove,
                wallets::commands::wallets_set_current_wallet,
                wallets::commands::wallets_set_current_path,
                wallets::commands::wallets_get_wallet_addresses,
                wallets::commands::wallets_get_mnemonic_addresses,
                wallets::commands::wallets_validate_mnemonic,
                wallets::commands::wallets_ledger_derive,
                dialogs::commands::dialog_get_payload,
                dialogs::commands::dialog_send,
                rpc::commands::rpc_send_transaction,
                rpc::commands::rpc_eth_call,
                rpc::commands::rpc_get_code,
                rpc::commands::rpc_is_contract,
                connections::commands::connections_affinity_for,
                connections::commands::connections_set_affinity,
                sync::commands::sync_alchemy_is_network_supported,
                sync::commands::sync_get_native_balance,
                simulator::commands::simulator_run,
                simulator::commands::simulator_get_call_count,
            ])
            .plugin(tauri_plugin_os::init())
            .plugin(tauri_plugin_clipboard_manager::init())
            .plugin(tauri_plugin_shell::init());

        #[cfg(feature = "aptabase")]
        let builder = builder.plugin(build_aptabase_plugin());

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
        let settings = settings().get_all().await.ok();
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
                let _ = analytics::track_event(handle, "app_exited", None);
                #[cfg(feature = "aptabase")]
                let _ = handle.track_event("app_exited", None);

                #[cfg(feature = "stacks")]
                {
                    tokio::task::block_in_place(|| {
                        tokio::runtime::Handle::current().block_on(async {
                            if let Ok(r) = try_stacks() {
                                let _ = r.shutdown().await;
                            }
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
    tracing_utils::setup_file_logging(config_dir(app, args).join("logs"))?;

    let db = db::init(&resource(app, "db.sqlite3", args)).await?;
    app.manage(db.clone());

    // set up app's event listener
    let handle = app.handle().clone();
    tauri::async_runtime::spawn(async move {
        event_listener(handle).await;
    });

    // calls other crates' initialization logic. anvil needs to be started before networks,
    // otherwise the initial tracker won't be ready to spawn
    sync::init().await;
    settings::init(resource(app, "settings.json", args))?;
    ws::init(args).await;
    connections::init(resource(app, "connections.json", args)).await;
    wallets::init(resource(app, "wallets.json", args)).await;
    networks::init(resource(app, "networks.json", args)).await;
    forge::init().await?;
    analytics::init(app.handle()).await;

    analytics::track_event(app.handle(), "app_started", None)?;

    #[cfg(feature = "stacks")]
    stacks::init(args.stacks_port, resource(app, "stacks/", args)).await?;

    Ok(())
}

async fn event_listener(handle: AppHandle) {
    let mut rx = broadcast::subscribe_ui().await;

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

#[cfg(feature = "aptabase")]
fn build_aptabase_plugin<R: Runtime>() -> TauriPlugin<R> {
    #[cfg(debug_assertions)]
    let key = std::option_env!("APTABASE_KEY").unwrap_or("debug");

    #[cfg(not(debug_assertions))]
    let key = std::env!("APTABASE_KEY");

    tauri_plugin_aptabase::Builder::new(key).build()
}
