// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod app;
mod commands;
mod error;
mod menu;
#[cfg(not(target_os = "macos"))]
mod system_tray;

use error::AppResult;

#[tokio::main]
async fn main() -> AppResult<()> {
    iron_tracing::init()?;
    fix_path_env::fix()?;

    app::IronApp::build().await?.run();

    Ok(())
}
