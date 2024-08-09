use crate::feed::get_chainlink_price;
use ethers::types::I256;
use crate::Error;

#[tauri::command(rename_all = "snake_case")]
pub async fn exchange_rates_get_price(base_asset: String, quote_asset: String) -> Result<I256, Error> {
    let price = get_chainlink_price(base_asset, quote_asset).await;
    Ok(price)
}
