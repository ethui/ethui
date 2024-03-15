use iron_db::Db;
use iron_networks::Networks;
use iron_types::{Abi, Address, GlobalState};

use crate::error::{AppError, AppResult};

#[tauri::command]
pub fn get_build_mode() -> String {
    if cfg!(debug_assertions) {
        "debug".to_string()
    } else {
        "release".to_string()
    }
}

#[tauri::command]
pub fn get_version() -> String {
    std::env!("CARGO_PKG_VERSION").replace('\"', "")
}

#[tauri::command]
pub async fn ui_error(message: String, _stack: Option<Vec<String>>) -> AppResult<()> {
    tracing::error!(error_type = "UI Error", message = message);

    Ok(())
}
