use alloy::json_abi::JsonAbi;
use ethui_types::{
    events::Tx, transactions::Transaction, Address, Contract, Erc721TokenData, TokenBalance,
    TokenMetadata, UINotify, B256, U256,
};

use super::Result;
use crate::{pagination::TxIdx, Db};

#[tauri::command]
pub async fn db_get_newer_transactions(
    address: Address,
    chain_id: u32,
    max: u32,
    first_known: Option<TxIdx>,
    db: tauri::State<'_, Db>,
) -> Result<Vec<Transaction>> {
    db.get_newer_transactions(chain_id, address, max, first_known)
        .await
}

#[tauri::command]
pub async fn db_get_older_transactions(
    address: Address,
    chain_id: u32,
    max: u32,
    last_known: Option<TxIdx>,
    db: tauri::State<'_, Db>,
) -> Result<Vec<Transaction>> {
    db.get_older_transactions(chain_id, address, max, last_known)
        .await
}

#[tauri::command]
pub async fn db_get_transaction_by_hash(
    chain_id: u32,
    hash: B256,
    db: tauri::State<'_, Db>,
) -> Result<Tx> {
    tracing::trace!("db_get_transaction_by_hash");
    let tx = db.get_transaction_by_hash(chain_id, hash).await?;

    if tx.incomplete {
        // force fetch, and read again from DB
        ethui_broadcast::fetch_full_tx_sync(chain_id, hash).await;
        Ok(db.get_transaction_by_hash(chain_id, hash).await?)
    } else {
        Ok(tx)
    }
}

#[tauri::command]
pub async fn db_get_erc20_metadata(
    chain_id: u32,
    contract: Address,
    db: tauri::State<'_, Db>,
) -> Result<TokenMetadata> {
    db.get_erc20_metadata(contract, chain_id).await
}

#[tauri::command]
pub async fn db_get_erc20_balances(
    chain_id: u32,
    address: Address,
    include_blacklisted: Option<bool>,
    db: tauri::State<'_, Db>,
) -> Result<Vec<TokenBalance>> {
    db.get_erc20_balances(chain_id, address, include_blacklisted.unwrap_or_default())
        .await
}

#[tauri::command]
pub async fn db_get_erc20_blacklist(
    chain_id: u32,
    address: Address,
    db: tauri::State<'_, Db>,
) -> Result<Vec<TokenBalance>> {
    db.get_erc20_blacklist(chain_id, address).await
}

#[tauri::command]
pub async fn db_get_native_balance(
    chain_id: u32,
    address: Address,
    db: tauri::State<'_, Db>,
) -> Result<U256> {
    Ok(db.get_native_balance(chain_id, address).await)
}

#[tauri::command]
pub async fn db_get_contracts(chain_id: u32, db: tauri::State<'_, Db>) -> Result<Vec<Contract>> {
    db.get_contracts(chain_id).await
}

#[tauri::command]
pub async fn db_get_contract_abi(
    address: Address,
    chain_id: u32,
    db: tauri::State<'_, Db>,
) -> Result<JsonAbi> {
    db.get_contract_abi(chain_id, address).await
}

#[tauri::command]
pub async fn db_get_erc721_tokens(
    chain_id: u32,
    owner: Address,
    db: tauri::State<'_, Db>,
) -> Result<Vec<Erc721TokenData>> {
    db.get_erc721_tokens(chain_id, owner).await
}

#[tauri::command]
pub async fn db_set_erc20_blacklist(
    chain_id: u32,
    address: Address,
    blacklisted: bool,
    db: tauri::State<'_, Db>,
) -> Result<()> {
    db.set_erc20_blacklist(chain_id, address, blacklisted)
        .await?;
    ethui_broadcast::ui_notify(UINotify::BalancesUpdated).await;

    Ok(())
}

#[tauri::command]
pub async fn db_clear_erc20_blacklist(
    chain_id: u32,
    address: Address,
    db: tauri::State<'_, Db>,
) -> Result<()> {
    db.clear_erc20_blacklist(chain_id, address).await?;
    ethui_broadcast::ui_notify(UINotify::BalancesUpdated).await;

    Ok(())
}
