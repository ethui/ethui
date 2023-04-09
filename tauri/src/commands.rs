use ethers::types::Address;

use crate::context::{Context, Network, Wallet};
use crate::store::transactions::TransactionStore;

type Ctx<'a> = tauri::State<'a, Context>;
type Result<T> = std::result::Result<T, String>;

impl From<crate::error::Error> for String {
    fn from(e: crate::error::Error) -> Self {
        e.to_string()
    }
}

#[tauri::command]
pub async fn get_current_network(ctx: Ctx<'_>) -> Result<Network> {
    let ctx = ctx.lock().await;

    Ok(ctx.networks.get(&ctx.current_network).cloned().unwrap())
}

#[tauri::command]
pub async fn get_networks(ctx: Ctx<'_>) -> Result<Vec<Network>> {
    let ctx = ctx.lock().await;
    Ok(ctx.networks.values().cloned().collect())
}

#[tauri::command]
pub async fn set_current_network(network: String, ctx: Ctx<'_>) -> Result<()> {
    ctx.lock().await.set_current_network(network)?;

    Ok(())
}

#[tauri::command]
pub async fn set_networks(networks: Vec<Network>, ctx: Ctx<'_>) -> Result<()> {
    ctx.lock().await.set_networks(networks);
    Ok(())
}

#[tauri::command]
pub async fn get_wallet(ctx: Ctx<'_>) -> Result<Wallet> {
    let ctx = ctx.lock().await;

    Ok(ctx.wallet.clone())
}

#[tauri::command]
pub async fn set_wallet(wallet: Wallet, ctx: Ctx<'_>) -> Result<()> {
    ctx.lock().await.set_wallet(wallet);
    Ok(())
}

#[tauri::command]
pub async fn get_current_address(ctx: Ctx<'_>) -> Result<String> {
    let ctx = ctx.lock().await;

    Ok(ctx.wallet.checksummed_address())
}

#[tauri::command]
pub async fn get_transactions(address: Address, ctx: Ctx<'_>) -> Result<Vec<String>> {
    let ctx = ctx.lock().await;

    // TODO: this unwrap is avoidable
    Ok(ctx.db.get_transactions(address).await.unwrap())
}

#[tauri::command]
pub async fn get_connections(ctx: Ctx<'_>) -> Result<Vec<String>> {
    let ctx = ctx.lock().await;

    Ok(ctx
        .peers
        .keys()
        .to_owned()
        .map(|p| format!("{}", p))
        .collect())
}

#[tauri::command]
pub async fn derive_addresses_with_mnemonic(
    mnemonic: String,
    derivation_path: String,
) -> Result<Vec<String>> {
    let addresses = Wallet::derive_addresses_with_mnemonic(&mnemonic, &derivation_path, 5).unwrap();

    Ok(addresses)
}

#[tauri::command]
pub async fn derive_addresses(ctx: Ctx<'_>) -> Result<Vec<String>> {
    let ctx = ctx.lock().await;

    let wallet = ctx.wallet.clone();
    let addresses = wallet.derive_addresses(5).unwrap();

    Ok(addresses)
}
