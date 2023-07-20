// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod app;
mod error;

use error::AppResult;

#[tokio::main]
async fn main() -> AppResult<()> {
    color_eyre::install()?;
    env_logger::init();
    fix_path_env::fix()?;

    let app = app::IronApp::build().await?;

    tokio::spawn(async { iron_ws::ws_server_loop().await });

    app.run();

    Ok(())
}
