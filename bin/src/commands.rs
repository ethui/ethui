use ethui_db::utils::{fetch_etherscan_abi, fetch_etherscan_contract_name};
use ethui_db::Db;
use ethui_networks::commands::networks_is_dev;
use ethui_proxy_detect::ProxyType;
use ethui_types::{Address, GlobalState, UINotify};

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

#[tauri::command]
pub async fn add_contract(
    chain_id: u64,
    address: Address,
    db: tauri::State<'_, Db>,
) -> AppResult<()> {
    let networks = ethui_networks::Networks::read().await;

    let network = networks
        .get_network(chain_id as u32)
        .ok_or(AppError::InvalidNetwork(chain_id as u32))?;
    let provider = network.get_alloy_provider().await?;

    let proxy = ethui_proxy_detect::detect_proxy(address, &provider).await?;

    let (abi, name) = if networks_is_dev().await? {
        (None, None)
    } else {
        let name = fetch_etherscan_contract_name(chain_id.into(), address).await?;
        let abi = match proxy {
            // Eip1167 minimal proxies don't have an ABI, and etherscan actually returns the implementation's ABI in this case, which we don't want
            Some(ProxyType::Eip1167(_)) => None,
            _ => fetch_etherscan_abi(chain_id.into(), address)
                .await?
                .map(|abi| serde_json::to_string(&abi).unwrap()),
        };

        (abi, name)
    };

    let proxy_for = proxy.map(|proxy| proxy.implementation());

    db.insert_contract_with_abi(chain_id as u32, address, abi, name, proxy_for)
        .await?;

    if proxy_for.is_some() {
        let _ = Box::pin(add_contract(chain_id, proxy_for.unwrap(), db)).await;
    }

    ethui_broadcast::ui_notify(UINotify::ContractsUpdated).await;
    Ok(())
}
