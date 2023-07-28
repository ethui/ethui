use ethers::types::{Address, U256};
use iron_types::{events::Tx, TokenBalance, Erc721Token};

use super::{Paginated, Pagination, Result};
use crate::{StoredContract, DB};

#[tauri::command]
pub async fn db_get_transactions(
    address: Address,
    chain_id: u32,
    pagination: Option<Pagination>,
    db: tauri::State<'_, DB>,
) -> Result<Paginated<Tx>> {
    db.get_transactions(chain_id, address, pagination.unwrap_or_default())
        .await
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
) -> Result<Vec<TokenBalance>> {
    db.get_erc20_balances(chain_id, address).await
}

#[tauri::command]
pub async fn db_get_native_balance(
    chain_id: u32,
    address: Address,
    db: tauri::State<'_, DB>,
) -> Result<U256> {
    Ok(db.get_native_balance(chain_id, address).await)
}

#[tauri::command]
pub async fn db_get_erc721_tokens(
    chain_id: u32,
    db: tauri::State<'_, DB>,
) -> Result<Vec<Erc721Token>> {
    db.get_erc721_tokens(chain_id).await
}

