use super::{Result, SerializedSettings, Settings};
use crate::types::GlobalState;

#[tauri::command]
pub async fn settings_get() -> SerializedSettings {
    Settings::read().await.get().clone()
}

#[tauri::command]
pub async fn settings_set(new_settings: SerializedSettings) -> Result<()> {
    Settings::write().await.set(new_settings)
}
