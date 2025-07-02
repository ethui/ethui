use ethui_types::{Address, TauriResult};

use crate::{
    actor::{
        get_actor, FinishOnboarding, FinishOnboardingStep, GetAlias, GetSettings, SetAlias,
        SetDarkMode, SetFastMode, SetSettings,
    },
    onboarding::OnboardingStep,
    DarkMode, SerializedSettings,
};

#[tauri::command]
pub async fn settings_get() -> TauriResult<SerializedSettings> {
    let actor = get_actor().await?;
    let settings = actor.ask(GetSettings).await?;
    Ok(settings)
}

#[tauri::command]
pub async fn settings_set(params: serde_json::Map<String, serde_json::Value>) -> TauriResult<()> {
    let actor = get_actor().await?;
    actor.ask(SetSettings(params)).await?;
    Ok(())
}

#[tauri::command]
pub async fn settings_set_dark_mode(mode: DarkMode) -> TauriResult<()> {
    let actor = get_actor().await?;
    actor.ask(SetDarkMode(mode)).await?;
    Ok(())
}

#[tauri::command]
pub async fn settings_set_fast_mode(mode: bool) -> TauriResult<()> {
    let actor = get_actor().await?;
    actor.ask(SetFastMode(mode)).await?;
    Ok(())
}

#[tauri::command]
pub async fn settings_finish_onboarding() -> TauriResult<()> {
    let actor = get_actor().await?;
    actor.ask(FinishOnboarding).await?;
    Ok(())
}

/// Gets the alias for an address
#[tauri::command]
pub async fn settings_get_alias(address: Address) -> TauriResult<Option<String>> {
    let actor = get_actor().await?;
    Ok(actor.ask(GetAlias(address)).await?)
}

/// Sets the alias for an address
#[tauri::command]
pub async fn settings_set_alias(address: Address, alias: Option<String>) -> TauriResult<()> {
    let actor = get_actor().await?;
    actor.ask(SetAlias(address, alias)).await?;
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
    let actor = get_actor().await?;
    actor.ask(FinishOnboardingStep(id)).await?;
    Ok(())
}

#[tauri::command]
pub async fn settings_onboarding_finish_all() -> TauriResult<()> {
    let actor = get_actor().await?;
    actor.ask(FinishOnboarding).await?;
    Ok(())
}
