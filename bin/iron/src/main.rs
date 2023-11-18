// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod app;
mod commands;
mod error;
mod menu;
#[cfg(not(target_os = "macos"))]
mod system_tray;
mod utils;

use error::AppResult;
use named_lock::NamedLock;

#[cfg(not(debug_assertions))]
static LOCK_NAME: &str = "iron-wallet";
#[cfg(debug_assertions)]
static LOCK_NAME: &str = "iron-wallet-dev";

#[tokio::main]
async fn main() -> AppResult<()> {
    let lock = NamedLock::create(LOCK_NAME)?;

    let _guard = match lock.try_lock() {
        Ok(g) => g,
        Err(_) => {
            iron_http::request_main_window_open().await?;
            panic!("App already running");
        }
    };

    iron_tracing::init()?;
    fix_path_env::fix()?;

    app::IronApp::build().await?.run();

    Ok(())
}
