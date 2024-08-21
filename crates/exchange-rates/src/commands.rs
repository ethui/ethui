use crate::feeds::{get_chainlink_price, get_pyth_price};
use ethers::types::I256;

#[tauri::command(rename_all = "snake_case")]
pub async fn exchange_rates_get_price(base_asset: String, quote_asset: String) -> I256 {
    let final_price = get_chainlink_price(base_asset.clone(), quote_asset.clone()).await;

    match final_price {
        Ok(chainlink_price) if chainlink_price != I256::from(0) => chainlink_price,
        _ => get_pyth_price(base_asset, quote_asset).await.unwrap(),
    }
}
