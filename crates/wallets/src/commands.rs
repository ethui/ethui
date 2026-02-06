use ethui_types::{Address, GlobalState, Json, SerializableError, TauriResult};

use super::{Wallet, WalletControl, Wallets, utils};

/// Lists all wallets
#[tauri::command]
pub async fn wallets_get_all() -> Vec<Wallet> {
    Wallets::read().await.get_all().clone()
}

/// Gets the current wallet
#[tauri::command]
pub async fn wallets_get_current() -> TauriResult<Wallet> {
    Ok(Wallets::read().await.get_current_wallet().clone())
}

/// Gets the current address ooof the current wallet
#[tauri::command]
pub async fn wallets_get_current_address() -> TauriResult<Address> {
    Ok(Wallets::read()
        .await
        .get_current_wallet()
        .get_current_address()
        .await?)
}

#[tauri::command]
pub async fn wallets_create(params: Json) -> TauriResult<()> {
    Wallets::write()
        .await
        .create(params)
        .await
        .map_err(SerializableError::from)
}

#[tauri::command]
pub async fn wallets_update(name: String, params: Json) -> TauriResult<()> {
    Wallets::write()
        .await
        .update(name, params)
        .await
        .map_err(SerializableError::from)
}

#[tauri::command]
pub async fn wallets_remove(name: String) -> TauriResult<()> {
    Wallets::write()
        .await
        .remove(name)
        .await
        .map_err(SerializableError::from)
}

/// Switches the current wallet
#[tauri::command]
pub async fn wallets_set_current_wallet(idx: usize) -> TauriResult<()> {
    Wallets::write()
        .await
        .set_current_wallet(idx)
        .await
        .map_err(SerializableError::from)
}

/// Switches the current key of the current wallet
#[tauri::command]
pub async fn wallets_set_current_path(key: String) -> TauriResult<()> {
    Wallets::write()
        .await
        .set_current_path(key)
        .await
        .map_err(SerializableError::from)
}

/// Get all known addresses of a wallet
#[tauri::command]
pub async fn wallets_get_wallet_addresses(name: String) -> TauriResult<Vec<(String, Address)>> {
    Ok(Wallets::read().await.get_wallet_addresses(name).await?)
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

//Checking the mnemonic when entering a new wallet
#[tauri::command]
pub fn wallets_validate_mnemonic(mnemonic: String) -> bool {
    utils::validate_mnemonic(&mnemonic)
}

#[tauri::command]
pub async fn wallets_ledger_derive(paths: Vec<String>) -> TauriResult<Vec<(String, Address)>> {
    utils::ledger_derive_multiple(paths)
        .await
        .map_err(SerializableError::from)
}
