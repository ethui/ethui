use ethers::types::{Address, U256};

use super::Result;
use crate::types::events::Tx;
use crate::{
    db::{StoredContract, DB},
    networks::Networks,
    types::GlobalState,
};

#[tauri::command]
pub async fn db_get_transactions(address: Address, db: tauri::State<'_, DB>) -> Result<Vec<Tx>> {
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
    chain_id: u32,
    address: Address,
    db: tauri::State<'_, DB>,
) -> Result<Vec<(Address, U256)>> {
    Ok(db.get_erc20_balances(chain_id, address).await.unwrap())
}

#[tauri::command]
pub async fn db_get_native_balance(
    chain_id: u32,
    address: Address,
    db: tauri::State<'_, DB>,
) -> Result<U256> {
    Ok(db.get_native_balance(chain_id, address).await.unwrap())
}
