use super::Feeds;
use iron_types::{GlobalState, Json};

#[tauri::command]
pub async fn exchange_rates_get_prices(params: Json) -> Option<i128> {
    Feeds::read().await.get_prices(params).await
}
