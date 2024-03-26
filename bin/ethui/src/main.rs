<<<<<<< HEAD:bin/iron/src/main.rs
use iron_lib::error::AppResult;
||||||| 4aec147:bin/iron/src/main.rs
// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod app;
mod commands;
mod dialogs;
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
=======
// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod app;
mod commands;
mod dialogs;
mod error;
mod menu;
#[cfg(not(target_os = "macos"))]
mod system_tray;
mod utils;

use error::AppResult;
use named_lock::NamedLock;

#[cfg(not(debug_assertions))]
static LOCK_NAME: &str = "ethui";
#[cfg(debug_assertions)]
static LOCK_NAME: &str = "ethui-dev";
>>>>>>> main:bin/ethui/src/main.rs

#[tokio::main]
async fn main() -> AppResult<()> {
<<<<<<< HEAD:bin/iron/src/main.rs
    iron_lib::run()
||||||| 4aec147:bin/iron/src/main.rs
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
=======
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
>>>>>>> main:bin/ethui/src/main.rs
}
