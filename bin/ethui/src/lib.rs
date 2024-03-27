// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod app;
mod commands;
mod dialogs;
pub mod error;
mod menu;
mod system_tray;
mod utils;

use error::AppResult;
use named_lock::NamedLock;

#[cfg(not(debug_assertions))]
static LOCK_NAME: &str = "iron-wallet";
#[cfg(debug_assertions)]
static LOCK_NAME: &str = "iron-wallet-dev";

#[tokio::main]
pub async fn run() -> AppResult<()> {
    ethui_tracing::init()?;
    fix_path_env::fix()?;

    let args = ethui_args::parse();
    let lock = NamedLock::create(LOCK_NAME)?;

    let _guard = match lock.try_lock() {
        Ok(g) => g,
        Err(_) => {
            ethui_http::request_main_window_open(args.http_port).await?;
            return Ok(());
        }
    };

    app::EthUIApp::build(&args).await?.run();

    Ok(())
}
