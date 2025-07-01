use ethui_types::Address;

use crate::{
    actor::{get_actor, GetSettings, SetSettings, SetDarkMode, SetFastMode, FinishOnboarding, FinishOnboardingStep, GetAlias, SetAlias},
    onboarding::OnboardingStep,
    DarkMode, Error, Result, SerializedSettings,
};

#[tauri::command]
pub async fn settings_get() -> Result<SerializedSettings> {
    let actor = get_actor().await?;
    Ok(actor.ask(GetSettings).await?)
}

#[tauri::command]
pub async fn settings_set(params: serde_json::Map<String, serde_json::Value>) -> Result<()> {
    let actor = get_actor().await?;
    actor.ask(SetSettings(params)).await.map_err(Error::from)
}

#[tauri::command]
pub async fn settings_set_dark_mode(mode: DarkMode) -> Result<()> {
    let actor = get_actor().await?;
    actor.ask(SetDarkMode(mode)).await.map_err(Error::from)
}

#[tauri::command]
pub async fn settings_set_fast_mode(mode: bool) -> Result<()> {
    let actor = get_actor().await?;
    actor.ask(SetFastMode(mode)).await.map_err(Error::from)
}

#[tauri::command]
pub async fn settings_finish_onboarding() -> Result<()> {
    let actor = get_actor().await?;
    actor.ask(FinishOnboarding).await.map_err(Error::from)
}

/// Gets the alias for an address
#[tauri::command]
pub async fn settings_get_alias(address: Address) -> Result<Option<String>> {
    let actor = get_actor().await?;
    Ok(actor.ask(GetAlias(address)).await?)
}

/// Sets the alias for an address
#[tauri::command]
pub async fn settings_set_alias(address: Address, alias: Option<String>) -> Result<()> {
    let actor = get_actor().await?;
    actor.ask(SetAlias(address, alias)).await.map_err(Error::from)
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
pub async fn settings_onboarding_finish_step(id: OnboardingStep) -> Result<()> {
    let actor = get_actor().await?;
    actor.ask(FinishOnboardingStep(id)).await.map_err(Error::from)
}

#[tauri::command]
pub async fn settings_onboarding_finish_all() -> Result<()> {
    let actor = get_actor().await?;
    actor.ask(FinishOnboarding).await.map_err(Error::from)
}
