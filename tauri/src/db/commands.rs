use ethers::types::{Address, U256};

use super::Result;
use crate::{
    db::DB,
    networks::Networks,
    store::events::{EventsStore, StoredContract},
    types::GlobalState,
};

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
pub async fn db_get_contracts(db: tauri::State<'_, DB>) -> Result<Vec<StoredContract>> {
    let networks = Networks::read().await;

    let chain_id = networks.get_current_network().chain_id;
    db.get_contracts(chain_id).await
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
