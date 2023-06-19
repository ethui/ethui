use super::{Result, Wallet, WalletControl, Wallets};
use crate::types::{ChecksummedAddress, GlobalState};

/// Lists all wallets
#[tauri::command]
pub async fn wallets_get_all() -> Vec<Wallet> {
    Wallets::read().await.get_all().clone()
}

/// Gets the current wallet
#[tauri::command]
pub async fn wallets_get_current() -> Result<Wallet> {
    Ok(Wallets::read().await.get_current_wallet().clone())
}

/// Gets the current address ooof the current wallet
#[tauri::command]
pub async fn wallets_get_current_address() -> Result<ChecksummedAddress> {
    Ok(Wallets::read()
        .await
        .get_current_wallet()
        .get_current_address()
        .await)
}

/// Sets a new list of wallets
/// Currently, the UI sends over the entire list to set, instead of adding/removing items
#[tauri::command]
pub async fn wallets_set_list(list: Vec<Wallet>) -> Result<()> {
    Wallets::write().await.set_wallets(list).await
}

#[tauri::command]
pub async fn wallets_create(wallet: Wallet) -> Result<()> {
    Wallets::write().await.create(wallet).await
}

#[tauri::command]
pub async fn wallets_update(name: String, params: Wallet) -> Result<()> {
    Wallets::write().await.update(name, params).await
}

#[tauri::command]
pub async fn wallets_remove(name: String) -> Result<()> {
    Wallets::write().await.remove(name).await
}

/// Switches the current wallet
#[tauri::command]
pub async fn wallets_set_current_wallet(idx: usize) -> Result<()> {
    Wallets::write().await.set_current_wallet(idx).await
}

/// Switches the current key of the current wallet
#[tauri::command]
pub async fn wallets_set_current_path(key: String) -> Result<()> {
    Wallets::write().await.set_current_path(key).await
}

/// Get all known addresses of a wallet
#[tauri::command]
pub async fn wallets_get_wallet_addresses(
    name: String,
) -> Result<Vec<(String, ChecksummedAddress)>> {
    Ok(Wallets::read().await.get_wallet_addresses(name).await)
}
