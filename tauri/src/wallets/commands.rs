use super::{wallet::Wallet, Wallets};
use crate::{global_state::GlobalState, types::ChecksummedAddress};

/// Lists all wallets
#[tauri::command]
pub async fn wallets_get_all() -> Vec<Wallet> {
    Wallets::read().await.get_all()
}

/// Gets the current wallet
#[tauri::command]
pub async fn wallets_get_current() -> Result<Wallet, String> {
    Ok(Wallets::read().await.get_current_wallet().clone())
}

/// Gets the current address ooof the current wallet
#[tauri::command]
pub async fn wallets_get_current_address() -> Result<ChecksummedAddress, String> {
    Ok(Wallets::read()
        .await
        .get_current_wallet()
        .get_current_address())
}

/// Sets a new list of wallets
/// Currently, the UI sends over the entire list to set, instead of adding/removing items
#[tauri::command]
pub async fn wallets_set_list(list: Vec<Wallet>) -> Result<(), String> {
    Wallets::write().await.set_wallets(list)
}

/// Switches the current wallet
#[tauri::command]
pub async fn wallets_set_current_wallet(idx: usize) -> Result<(), String> {
    Wallets::write().await.set_current_wallet(idx)
}

/// Switches the current key of the current wallet
#[tauri::command]
pub async fn wallets_set_current_key(key: String) -> Result<(), String> {
    Wallets::write().await.set_current_key(key)
}

/// Get all known addresses of a wallet
#[tauri::command]
pub async fn wallets_get_wallet_addresses(
    name: String,
) -> Result<Vec<(String, ChecksummedAddress)>, String> {
    Ok(Wallets::read().await.get_wallet_addresses(name))
}
