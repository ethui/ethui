use ethui_types::{Address, Json, SerializableError, TauriResult};

use super::{utils, Wallet, WalletControl, actor::*};

/// Lists all wallets
#[tauri::command]
pub async fn wallets_get_all() -> Vec<Wallet> {
    ask(GetAll).await.unwrap_or_default()
}

/// Gets the current wallet
#[tauri::command]
pub async fn wallets_get_current() -> TauriResult<Wallet> {
    ask(GetCurrent).await.map_err(SerializableError::from)
}

/// Gets the current address ooof the current wallet
#[tauri::command]
pub async fn wallets_get_current_address() -> TauriResult<Address> {
    ask(GetCurrentAddress).await.map_err(SerializableError::from)
}

#[tauri::command]
pub async fn wallets_create(params: Json) -> TauriResult<()> {
    ask(Create { params }).await.map_err(SerializableError::from)?
        .map_err(SerializableError::from)
}

#[tauri::command]
pub async fn wallets_update(name: String, params: Json) -> TauriResult<()> {
    ask(Update { name, params }).await.map_err(SerializableError::from)?
        .map_err(SerializableError::from)
}

#[tauri::command]
pub async fn wallets_remove(name: String) -> TauriResult<()> {
    ask(Remove { name }).await.map_err(SerializableError::from)?
        .map_err(SerializableError::from)
}

/// Switches the current wallet
#[tauri::command]
pub async fn wallets_set_current_wallet(idx: usize) -> TauriResult<()> {
    ask(SetCurrentWallet { idx }).await.map_err(SerializableError::from)?
        .map_err(SerializableError::from)
}

/// Switches the current key of the current wallet
#[tauri::command]
pub async fn wallets_set_current_path(key: String) -> TauriResult<()> {
    ask(SetCurrentPath { key }).await.map_err(SerializableError::from)?
        .map_err(SerializableError::from)
}

/// Get all known addresses of a wallet
#[tauri::command]
pub async fn wallets_get_wallet_addresses(name: String) -> TauriResult<Vec<(String, Address)>> {
    ask(GetWalletAddresses { name }).await.map_err(SerializableError::from)
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
