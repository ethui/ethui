use super::{Wallet, Wallets};
use crate::networks::Networks;
use crate::types::GlobalState;

type Result<T> = std::result::Result<T, String>;

impl From<crate::error::Error> for String {
    fn from(e: crate::error::Error) -> Self {
        e.to_string()
    }
}

#[tauri::command]
pub async fn get_wallet() -> Result<Wallet> {
    let wallets = Wallets::read().await;

    Ok(wallets.wallet.clone())
}

#[tauri::command]
pub async fn set_wallet(mut wallet: Wallet) -> Result<()> {
    let networks = Networks::read().await;

    // wallet is deserialized from frontend params, and doesn't yet know the chain_id
    // we need to manually set it
    let chain_id = networks.get_current_network().chain_id;
    wallet.update_chain_id(chain_id);

    let mut wallets = Wallets::write().await;
    wallets.set_wallet(wallet);
    Ok(())
}

#[tauri::command]
pub async fn get_current_address() -> Result<String> {
    let wallets = Wallets::read().await;

    Ok(wallets.wallet.checksummed_address())
}

#[tauri::command]
pub async fn derive_addresses_with_mnemonic(
    mnemonic: String,
    derivation_path: String,
) -> Result<Vec<String>> {
    Ok(Wallet::derive_addresses_with_mnemonic(
        &mnemonic,
        &derivation_path,
        5,
    )?)
}

#[tauri::command]
pub async fn derive_addresses() -> Result<Vec<String>> {
    let wallets = Wallets::read().await;

    let wallet = wallets.wallet.clone();
    let addresses = wallet.derive_addresses(5).unwrap();

    Ok(addresses)
}
