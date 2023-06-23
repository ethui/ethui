use ethers::types::{Address, U256};

use super::Result;
use crate::db::{StoredContract, DB};
use crate::types::events::Tx;

#[tauri::command]
pub async fn db_get_transactions(
    address: Address,
    chain_id: u32,
    db: tauri::State<'_, DB>,
) -> Result<Vec<Tx>> {
    Ok(db.get_transactions(chain_id, address).await.unwrap())
}

#[tauri::command]
pub async fn db_get_contracts(
    chain_id: u32,
    db: tauri::State<'_, DB>,
) -> Result<Vec<StoredContract>> {
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
    Ok(db.get_native_balance(chain_id, address).await)
}
