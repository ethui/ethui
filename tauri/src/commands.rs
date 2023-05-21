use ethers::types::{Address, U256};

use crate::context::{Context, Wallet};
use crate::db::DB;
use crate::networks::Networks;
use crate::store::events::EventsStore;
use crate::types::GlobalState;

pub type Ctx<'a> = tauri::State<'a, Context>;
type Result<T> = std::result::Result<T, String>;

impl From<crate::error::Error> for String {
    fn from(e: crate::error::Error) -> Self {
        e.to_string()
    }
}

#[tauri::command]
pub async fn get_wallet(ctx: Ctx<'_>) -> Result<Wallet> {
    let ctx = ctx.lock().await;

    Ok(ctx.wallet.clone())
}

#[tauri::command]
pub async fn set_wallet(mut wallet: Wallet, ctx: Ctx<'_>) -> Result<()> {
    let mut ctx = ctx.lock().await;
    let networks = Networks::read().await;

    // wallet is deserialized from frontend params, and doesn't yet know the chain_id
    // we need to manually set it
    let chain_id = networks.get_current_network().chain_id;
    wallet.update_chain_id(chain_id);

    ctx.set_wallet(wallet);
    Ok(())
}

#[tauri::command]
pub async fn get_current_address(ctx: Ctx<'_>) -> Result<String> {
    let ctx = ctx.lock().await;

    Ok(ctx.wallet.checksummed_address())
}

#[tauri::command]
pub async fn get_transactions(address: Address, db: tauri::State<'_, DB>) -> Result<Vec<String>> {
    let networks = Networks::read().await;

    // TODO: this unwrap is avoidable
    let chain_id = networks.get_current_network().chain_id;
    Ok(db.get_transactions(chain_id, address).await.unwrap())
}

#[tauri::command]
pub async fn get_contracts(db: tauri::State<'_, DB>) -> Result<Vec<String>> {
    let networks = Networks::read().await;

    // TODO: this unwrap is avoidable
    let chain_id = networks.get_current_network().chain_id;
    Ok(db.get_contracts(chain_id).await.unwrap())
}

#[tauri::command]
pub async fn get_erc20_balances(
    address: Address,
    db: tauri::State<'_, DB>,
) -> Result<Vec<(Address, U256)>> {
    let networks = Networks::read().await;

    let chain_id = networks.get_current_network().chain_id;
    Ok(db.get_balances(chain_id, address).await.unwrap())
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
pub async fn derive_addresses(ctx: Ctx<'_>) -> Result<Vec<String>> {
    let ctx = ctx.lock().await;

    let wallet = ctx.wallet.clone();
    let addresses = wallet.derive_addresses(5).unwrap();

    Ok(addresses)
}
