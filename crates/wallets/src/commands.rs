use std::path::Path;

use iron_types::{Address, GlobalState, Json};

use super::{utils, Result, Wallet, WalletControl, Wallets};

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
pub async fn wallets_get_current_address() -> Result<Address> {
    Ok(Wallets::read()
        .await
        .get_current_wallet()
        .get_current_address()
        .await)
}

#[tauri::command]
pub async fn wallets_create(params: Json) -> Result<()> {
    Wallets::write().await.create(params).await
}

#[tauri::command]
pub async fn wallets_update(name: String, params: Json) -> Result<()> {
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
pub async fn wallets_get_wallet_addresses(name: String) -> Result<Vec<(String, Address)>> {
    Ok(Wallets::read().await.get_wallet_addresses(name).await)
}

/// Derives the list of addresses for a given mnemonic Used when importing a new wallet in the UI,
/// to provide feedback before the wallet is actually created
#[tauri::command]
pub async fn wallets_get_mnemonic_addresses(
    mnemonic: String,
    derivation_path: String,
) -> Vec<(String, Address)> {
    utils::derive_addresses(&mnemonic, &derivation_path, 5)
}

#[tauri::command]
pub async fn wallets_get_mnemonic_addresses_from_pgp(
    file: String,
    derivation_path: String,
) -> Result<Vec<(String, Address)>> {
    let mnemonic = utils::read_pgp_secret(Path::new(&file))?;
    Ok(utils::derive_addresses(&mnemonic, &derivation_path, 5))
}

//Checking the mnemonic when entering a new wallet
#[tauri::command]
pub fn wallets_validate_mnemonic(mnemonic: String) -> bool {
    utils::validate_mnemonic(&mnemonic)
}

#[tauri::command]
pub async fn wallets_ledger_derive(paths: Vec<String>) -> Result<Vec<(String, Address)>> {
    utils::ledger_derive_multiple(paths).await
}

#[tauri::command]
pub fn wallets_read_pgp_secret(file: String) -> Result<String> {
    utils::read_pgp_secret(Path::new(&file))
}
