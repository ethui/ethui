use iron_types::{Address, GlobalState};

use super::{DarkMode, Result, SerializedSettings, Settings};

#[tauri::command]
pub async fn settings_get() -> SerializedSettings {
    Settings::read().await.get().clone()
}

#[tauri::command]
pub async fn settings_set(params: serde_json::Map<String, serde_json::Value>) -> Result<()> {
    Settings::write().await.set(params).await
}

#[tauri::command]
pub async fn settings_set_dark_mode(mode: DarkMode) -> Result<()> {
    Settings::write().await.set_dark_mode(mode).await
}

#[tauri::command]
pub async fn settings_set_fast_mode(mode: bool) -> Result<()> {
    Settings::write().await.set_fast_mode(mode).await
}

#[tauri::command]
pub async fn settings_finish_onboarding() -> Result<()> {
    Settings::write().await.finish_onboarding().await
}

#[tauri::command]
pub async fn settings_finish_homepage_tour() -> Result<()> {
    Settings::write().await.finish_homepage_tour().await
}

/// Gets the alias for an address
#[tauri::command]
pub async fn settings_get_alias(address: Address) -> Option<String> {
    Settings::read().await.get_alias(address)
}

/// Sets the alias for an address
#[tauri::command]
pub async fn settings_set_alias(address: Address, alias: Option<String>) {
    Settings::write().await.set_alias(address, alias)
}

#[tauri::command]
pub async fn settings_test_alchemy_api_key(key: String) -> bool {
    crate::utils::test_alchemy_api_key(key).await
}

#[tauri::command]
pub async fn settings_test_etherscan_api_key(key: String) -> bool {
    crate::utils::test_etherscan_api_key(key).await
}
