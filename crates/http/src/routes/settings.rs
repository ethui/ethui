use axum::{
    extract::Query,
    routing::{get, post},
    Json, Router,
};
use iron_settings::{DarkMode, SerializedSettings};
use iron_types::ChecksummedAddress;
use serde::Deserialize;

use crate::{Ctx, Result};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SetSettings {
    new_settings: SerializedSettings,
}

#[derive(Debug, Deserialize)]
pub(crate) struct DarkModeParams {
    mode: DarkMode,
}

#[derive(Debug, Deserialize)]
pub(crate) struct FastModeParams {
    mode: bool,
}

#[derive(Debug, Deserialize)]
pub(crate) struct GetAliasParams {
    address: ChecksummedAddress,
}

#[derive(Debug, Deserialize)]
pub(crate) struct SetAliasParams {
    address: ChecksummedAddress,
    alias: Option<String>,
}

pub(super) fn router() -> Router<Ctx> {
    Router::new()
        .route("/", get(settings))
        .route("/", post(set_settings))
        .route("/set_dark_mode", post(set_dark_mode))
        .route("/set_fast_mode", post(set_fast_mode))
        .route("/finish_onboarding", post(finish_onboarding))
        .route("/alias", get(alias))
        .route("/alias", post(set_alias))
}

pub(crate) async fn settings() -> Json<SerializedSettings> {
    Json(iron_settings::commands::settings_get().await)
}

pub(crate) async fn set_settings(Json(payload): Json<SetSettings>) -> Result<()> {
    iron_settings::commands::settings_set(payload.new_settings).await?;

    Ok(())
}

pub(crate) async fn set_dark_mode(Query(params): Query<DarkModeParams>) -> Result<()> {
    iron_settings::commands::settings_set_dark_mode(params.mode).await?;

    Ok(())
}

pub(crate) async fn set_fast_mode(Query(params): Query<FastModeParams>) -> Result<()> {
    iron_settings::commands::settings_set_fast_mode(params.mode).await?;

    Ok(())
}

pub(crate) async fn finish_onboarding() -> Result<()> {
    iron_settings::commands::settings_finish_onboarding().await?;

    Ok(())
}

pub(crate) async fn alias(Query(params): Query<GetAliasParams>) -> Json<Option<String>> {
    Json(iron_settings::commands::settings_get_alias(params.address).await)
}

pub(crate) async fn set_alias(Query(params): Query<SetAliasParams>) -> Result<()> {
    iron_settings::commands::settings_set_alias(params.address, params.alias).await;

    Ok(())
}
