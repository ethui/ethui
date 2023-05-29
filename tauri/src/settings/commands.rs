use super::{Result, SerializedSettings, Settings};
use crate::types::{ChecksummedAddress, GlobalState};

#[tauri::command]
pub async fn settings_get() -> SerializedSettings {
    Settings::read().await.get().clone()
}

#[tauri::command]
pub async fn settings_set(new_settings: SerializedSettings) -> Result<()> {
    Settings::write().await.set(new_settings)
}

/// Gets the alias for an address
#[tauri::command]
pub async fn settings_get_alias(address: ChecksummedAddress) -> Option<String> {
    Settings::read().await.get_alias(address)
}

/// Sets the alias for an address
#[tauri::command]
pub async fn settings_set_alias(address: ChecksummedAddress, alias: Option<String>) {
    Settings::write().await.set_alias(address, alias)
}
