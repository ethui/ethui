use ethers::types::{Address, Chain, U256};
use iron_types::{events::Tx, TokenBalance, UINotify};

use super::{Paginated, Pagination, Result};
use crate::{
    utils::{fetch_etherscan_abi, fetch_etherscan_contract_name},
    Error, StoredContract, DB,
};

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
pub async fn db_get_contracts(
    chain_id: u32,
    db: tauri::State<'_, DB>,
) -> Result<Vec<StoredContract>> {
    db.get_contracts(chain_id).await
}

#[tauri::command]
pub async fn db_insert_contract(
    chain_id: u32,
    address: Address,
    db: tauri::State<'_, DB>,
) -> Result<()> {
    let chain = Chain::try_from(chain_id).map_err(|_| Error::InvalidChain)?;
    let name = fetch_etherscan_contract_name(chain, address).await?;
    let abi = fetch_etherscan_abi(chain, address)
        .await?
        .map(|abi| serde_json::to_string(&abi).unwrap());

    // self.window_snd.send(UINotify::BalancesUpdated.into())?;
    // send ContractsUpdated event to UI using iron_broadcast

    db.insert_contract_with_abi(chain_id, address, abi, name)
        .await?;

    iron_broadcast::ui_notify(UINotify::ContractsUpdated).await;

    Ok(())
}
