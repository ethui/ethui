use ethui_types::{Address, GlobalState};
use serde_json::json;

use super::{DarkMode, Result, SerializedSettings, Settings};
use crate::{onboarding::OnboardingStep, Error};

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

/// Gets the alias for an address
#[tauri::command]
pub async fn settings_get_alias(address: Address) -> Option<String> {
    Settings::read().await.get_alias(address)
}

/// Sets the alias for an address
#[tauri::command]
pub async fn settings_set_alias(address: Address, alias: Option<String>) -> Result<()> {
    Settings::write().await.set_alias(address, alias).await
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
    Settings::write().await.finish_onboarding_step(id).await
}

#[tauri::command]
pub async fn settings_onboarding_finish_all() -> Result<()> {
    Settings::write().await.finish_onboarding().await
}

#[tauri::command]
pub async fn settings_stacks_auth_send_code(email: String) -> Result<()> {
    let email = email.trim().to_owned();

    dbg!(
        reqwest::Client::new()
            .post("https://api.stacks.ethui.dev/auth/send-code")
            .json(&json!({ "email": email}))
            .send()
            .await
    )?;

    Ok(())
}

#[tauri::command]
pub async fn settings_stacks_auth_verify_code(
    email: String,
    code: String,
) -> Result<serde_json::Value> {
    let email = email.trim().to_owned();

    let resp = reqwest::Client::new()
        .post("https://api.stacks.ethui.dev/auth/verify-code")
        .json(&json!({ "email": email, "code": code}))
        .send()
        .await?;

    let body = resp.json::<serde_json::Value>().await?;
    dbg!(&body);
    let jwt = body["token"].as_str().ok_or(Error::StacksAuth)?.to_owned();

    Settings::write().await.set_stacks(email, jwt).await?;

    Ok(body)
}
