// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod app;
mod commands;
mod dialogs;
mod error;
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
async fn main() -> AppResult<()> {
    iron_tracing::init()?;
    fix_path_env::fix()?;

    let args = iron_args::parse();
    let lock = NamedLock::create(LOCK_NAME)?;

    let _guard = match lock.try_lock() {
        Ok(g) => g,
        Err(_) => {
            iron_http::request_main_window_open(args.http_port).await?;
            return Ok(());
        }
    };

    app::IronApp::build(&args).await?.run();

    Ok(())
}
