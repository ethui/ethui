use ethers::types::{Address, U256};

use crate::db::DB;
use crate::networks::Networks;
use crate::store::events::EventsStore;
use crate::types::GlobalState;

type Result<T> = std::result::Result<T, String>;

#[tauri::command]
pub async fn db_get_transactions(
    address: Address,
    db: tauri::State<'_, DB>,
) -> Result<Vec<String>> {
    let networks = Networks::read().await;

    let chain_id = networks.get_current_network().chain_id;
    Ok(db.get_transactions(chain_id, address).await.unwrap())
}

#[tauri::command]
pub async fn db_get_contracts(db: tauri::State<'_, DB>) -> Result<Vec<String>> {
    let networks = Networks::read().await;

    let chain_id = networks.get_current_network().chain_id;
    Ok(db.get_contracts(chain_id).await.unwrap())
}

#[tauri::command]
pub async fn db_get_erc20_balances(
    address: Address,
    db: tauri::State<'_, DB>,
) -> Result<Vec<(Address, U256)>> {
    let networks = Networks::read().await;

    let chain_id = networks.get_current_network().chain_id;
    Ok(db.get_balances(chain_id, address).await.unwrap())
}
