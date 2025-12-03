use common::{Address, TauriResult};

use crate::{DarkMode, Settings, actor::{SettingsActorExt as _, settings}, onboarding::OnboardingStep};

#[tauri::command]
pub async fn settings_get() -> TauriResult<Settings> {
    Ok(settings().get_all().await?)
}

#[tauri::command]
pub async fn settings_set(params: serde_json::Map<String, serde_json::Value>) -> TauriResult<()> {
    settings().set_all(params).await?;
    Ok(())
}

#[tauri::command]
pub async fn settings_set_dark_mode(mode: DarkMode) -> TauriResult<()> {
    settings().set_dark_mode(mode).await?;
    Ok(())
}

#[tauri::command]
pub async fn settings_set_fast_mode(mode: bool) -> TauriResult<()> {
    settings().set_fast_mode(mode).await?;
    Ok(())
}

#[tauri::command]
pub async fn settings_finish_onboarding() -> TauriResult<()> {
    settings().finish_onboarding().await?;
    Ok(())
}

/// Gets the alias for an address
#[tauri::command]
pub async fn settings_get_alias(address: Address) -> TauriResult<Option<String>> {
    Ok(settings().get_alias(address).await?)
}

/// Sets the alias for an address
#[tauri::command]
pub async fn settings_set_alias(address: Address, alias: Option<String>) -> TauriResult<()> {
    settings().set_alias(address, alias).await?;
    Ok(())
}

#[tauri::command]
pub async fn settings_onboarding_finish_step(id: OnboardingStep) -> TauriResult<()> {
    settings().finish_onboarding_step(id).await?;
    Ok(())
}

#[tauri::command]
pub async fn settings_set_run_local_stacks(mode: bool) -> TauriResult<()> {
    settings().set_run_local_stacks(mode).await?;
    Ok(())
}

#[tauri::command]
pub async fn settings_onboarding_finish_all() -> TauriResult<()> {
    settings().finish_onboarding().await?;
    Ok(())
}
