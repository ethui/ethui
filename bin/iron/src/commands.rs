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
pub async fn get_contract_abi(
    chain_id: u32,
    address: Address,
    db: tauri::State<'_, Db>,
) -> AppResult<Option<Abi>> {
    let network = Networks::read()
        .await
        .get_network(chain_id)
        .ok_or(AppError::InvalidNetwork)?;

    if network.is_dev() {
        Ok(iron_forge::commands::forge_get_abi(address, chain_id).await?)
    } else {
        let abi = db.get_contract_abi(chain_id, address).await?;

        Ok(Some(abi))
    }
}

#[tauri::command]
pub async fn ui_error(message: String, _stack: Option<Vec<String>>) -> AppResult<()> {
    tracing::error!(error_type = "UI Error", message = message);

    Ok(())
}
