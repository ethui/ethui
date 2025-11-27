use ethui_types::{Address, TauriResult};

use crate::{DarkMode, Settings, actor::*, onboarding::OnboardingStep};

#[tauri::command]
pub async fn settings_get() -> TauriResult<Settings> {
    Ok(settings().ask(GetAll).await?)
}

#[tauri::command]
pub async fn settings_set(params: serde_json::Map<String, serde_json::Value>) -> TauriResult<()> {
    settings().ask(Set::All(params)).await?;
    Ok(())
}

#[tauri::command]
pub async fn settings_set_dark_mode(mode: DarkMode) -> TauriResult<()> {
    settings().ask(Set::DarkMode(mode)).await?;
    Ok(())
}

#[tauri::command]
pub async fn settings_set_fast_mode(mode: bool) -> TauriResult<()> {
    settings().ask(Set::FastMode(mode)).await?;
    Ok(())
}

#[tauri::command]
pub async fn settings_finish_onboarding() -> TauriResult<()> {
    settings().ask(Set::FinishOnboarding).await?;
    Ok(())
}

/// Gets the alias for an address
#[tauri::command]
pub async fn settings_get_alias(address: Address) -> TauriResult<Option<String>> {
    Ok(settings().ask(GetAlias(address)).await?)
}

/// Sets the alias for an address
#[tauri::command]
pub async fn settings_set_alias(address: Address, alias: Option<String>) -> TauriResult<()> {
    settings().ask(Set::Alias(address, alias)).await?;
    Ok(())
}

#[tauri::command]
pub async fn settings_onboarding_finish_step(id: OnboardingStep) -> TauriResult<()> {
    settings().tell(Set::FinishOnboardingStep(id)).await?;
    Ok(())
}

#[tauri::command]
pub async fn settings_set_run_local_stacks(mode: bool) -> TauriResult<()> {
    settings().tell(Set::RunLocalStacks(mode)).await?;
    Ok(())
}

#[tauri::command]
pub async fn settings_onboarding_finish_all() -> TauriResult<()> {
    settings().tell(Set::FinishOnboarding).await?;
    Ok(())
}
