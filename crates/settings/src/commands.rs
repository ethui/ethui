use ethui_types::{Address, TauriResult};

use crate::{ask, onboarding::OnboardingStep, tell, DarkMode, GetAlias, GetAll, Set, Settings};

#[tauri::command]
pub async fn settings_get() -> TauriResult<Settings> {
    Ok(ask(GetAll).await?)
}

#[tauri::command]
pub async fn settings_set(params: serde_json::Map<String, serde_json::Value>) -> TauriResult<()> {
    ask(Set::All(params)).await?;
    Ok(())
}

#[tauri::command]
pub async fn settings_set_dark_mode(mode: DarkMode) -> TauriResult<()> {
    ask(Set::DarkMode(mode)).await?;
    Ok(())
}

#[tauri::command]
pub async fn settings_set_fast_mode(mode: bool) -> TauriResult<()> {
    ask(Set::FastMode(mode)).await?;
    Ok(())
}

#[tauri::command]
pub async fn settings_finish_onboarding() -> TauriResult<()> {
    ask(Set::FinishOnboarding).await?;
    Ok(())
}

/// Gets the alias for an address
#[tauri::command]
pub async fn settings_get_alias(address: Address) -> TauriResult<Option<String>> {
    Ok(ask(GetAlias(address)).await?)
}

/// Sets the alias for an address
#[tauri::command]
pub async fn settings_set_alias(address: Address, alias: Option<String>) -> TauriResult<()> {
    ask(Set::Alias(address, alias)).await?;
    Ok(())
}

#[tauri::command]
pub async fn settings_test_alchemy_api_key(key: String) -> bool {
    crate::utils::test_alchemy_api_key(key).await
}

#[tauri::command]
pub async fn settings_test_etherscan_api_key(key: String) -> bool {
    crate::utils::test_etherscan_api_key(key).await
}

#[tauri::command]
pub async fn settings_test_rust_log(directives: String) -> bool {
    ethui_tracing::parse(&directives).is_ok()
}

#[tauri::command]
pub async fn settings_onboarding_finish_step(id: OnboardingStep) -> TauriResult<()> {
    tell(Set::FinishOnboardingStep(id)).await?;
    Ok(())
}

#[tauri::command]
pub async fn settings_set_run_local_stacks(mode: bool) -> TauriResult<()> {
    tell(Set::RunLocalStacks(mode)).await?;
    Ok(())
}

#[tauri::command]
pub async fn settings_onboarding_finish_all() -> TauriResult<()> {
    tell(Set::FinishOnboarding).await?;
    Ok(())
}
