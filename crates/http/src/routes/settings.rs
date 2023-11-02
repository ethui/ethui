use axum::{
    extract::Query,
    routing::{get, post},
    Json, Router,
};
use iron_settings::{DarkMode, SerializedSettings};
use iron_types::Address;
use serde::Deserialize;

use crate::{Ctx, Result};

pub(super) fn router() -> Router<Ctx> {
    Router::new()
        .route("/", get(settings))
        .route("/", post(set_settings))
        .route("/set_dark_mode", post(set_dark_mode))
        .route("/set_fast_mode", post(set_fast_mode))
        .route("/finish_onboarding", post(finish_onboarding))
        .route("/finish_homepage_tour", post(finish_homepage_tour))
        .route("/alias", get(alias))
        .route("/alias", post(set_alias))
}

pub(crate) async fn settings() -> Json<SerializedSettings> {
    Json(iron_settings::commands::settings_get().await)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SetSettings {
    new_settings: serde_json::Map<String, serde_json::Value>,
}

pub(crate) async fn set_settings(Json(payload): Json<SetSettings>) -> Result<()> {
    iron_settings::commands::settings_set(payload.new_settings).await?;

    Ok(())
}

#[derive(Debug, Deserialize)]
pub(crate) struct SetDarkModePayload {
    mode: DarkMode,
}

pub(crate) async fn set_dark_mode(Json(params): Json<SetDarkModePayload>) -> Result<()> {
    iron_settings::commands::settings_set_dark_mode(params.mode).await?;

    Ok(())
}

#[derive(Debug, Deserialize)]
pub(crate) struct SetFastModePayload {
    mode: bool,
}

pub(crate) async fn set_fast_mode(Json(params): Json<SetFastModePayload>) -> Result<()> {
    iron_settings::commands::settings_set_fast_mode(params.mode).await?;

    Ok(())
}

pub(crate) async fn finish_onboarding() -> Result<()> {
    iron_settings::commands::settings_finish_onboarding().await?;

    Ok(())
}

pub(crate) async fn finish_homepage_tour() -> Result<()> {
    iron_settings::commands::settings_finish_homepage_tour().await?;

    Ok(())
}

#[derive(Debug, Deserialize)]
pub(crate) struct GetAliasPayload {
    address: Address,
}

pub(crate) async fn alias(Query(params): Query<GetAliasPayload>) -> Json<Option<String>> {
    Json(iron_settings::commands::settings_get_alias(params.address).await)
}

#[derive(Debug, Deserialize)]
pub(crate) struct SetAliasPayload {
    address: Address,
    alias: Option<String>,
}

pub(crate) async fn set_alias(Json(params): Json<SetAliasPayload>) -> Result<()> {
    iron_settings::commands::settings_set_alias(params.address, params.alias).await;

    Ok(())
}
