use crate::context::{Context, Network, Wallet};

type Ctx<'a> = tauri::State<'a, Context>;
type Result<T> = std::result::Result<T, ()>;

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
    ctx.lock().await.set_current_network(network);
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
