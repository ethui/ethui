use ethers::types::{Address, U256};

use crate::context::{Context, Network};
use crate::store::events::EventsStore;

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
pub async fn get_transactions(address: Address, ctx: Ctx<'_>) -> Result<Vec<String>> {
    let ctx = ctx.lock().await;

    // TODO: this unwrap is avoidable
    let chain_id = ctx.get_current_network().chain_id;
    Ok(ctx.db.get_transactions(chain_id, address).await.unwrap())
}

#[tauri::command]
pub async fn get_contracts(ctx: Ctx<'_>) -> Result<Vec<String>> {
    let ctx = ctx.lock().await;

    // TODO: this unwrap is avoidable
    let chain_id = ctx.get_current_network().chain_id;
    Ok(ctx.db.get_contracts(chain_id).await.unwrap())
}

#[tauri::command]
pub async fn get_erc20_balances(address: Address, ctx: Ctx<'_>) -> Result<Vec<(Address, U256)>> {
    let ctx = ctx.lock().await;

    let chain_id = ctx.get_current_network().chain_id;
    Ok(ctx.db.get_balances(chain_id, address).await.unwrap())
}
