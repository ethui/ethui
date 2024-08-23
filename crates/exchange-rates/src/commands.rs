use crate::feeds::{get_chainlink_price, get_pyth_price};
use ethers::types::I256;

#[tauri::command(rename_all = "snake_case")]
pub async fn exchange_rates_get_price(base_asset: String, quote_asset: String) -> Option<I256> {
    match get_chainlink_price(base_asset.clone(), quote_asset.clone()).await {
        Ok(chainlink_price) => Some(chainlink_price),
        Err(_) => match get_pyth_price(base_asset, quote_asset).await {
            Ok(pyth_price) => Some(pyth_price),
            Err(_) => None,
        },
    }
}
