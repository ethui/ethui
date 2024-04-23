use axum::{
    extract::{Path, Query},
    routing::{delete, get, post, put},
    Json, Router,
};
use ethui_types::Address;
use ethui_wallets::Wallet;
use serde::Deserialize;

use crate::{Ctx, Result};

pub(super) fn router() -> Router<Ctx> {
    Router::new()
        .route("/all", get(all))
        .route("/current_wallet", get(current_wallet))
        .route("/current_address", get(current_address))
        .route("/wallet", post(create))
        .route("/wallet/:name", put(update))
        .route("/wallet/:name", delete(remove))
        .route("/current_wallet", post(set_current_wallet))
        .route("/current_path", post(set_current_path))
        .route("/wallet_addresses", get(get_wallet_addresses))
        .route("/mnemonic_addresses", get(get_mnemonic_addresses))
        .route("/validate_mnemonic", get(validate_mnemonic))
}

#[derive(Debug, Deserialize)]
pub(crate) struct SetCurrentPathPayload {
    key: String,
}

pub(crate) async fn all() -> Json<Vec<Wallet>> {
    Json(ethui_wallets::commands::wallets_get_all().await)
}

pub(crate) async fn current_wallet() -> Result<Json<Wallet>> {
    Ok(Json(ethui_wallets::commands::wallets_get_current().await?))
}

pub(crate) async fn current_address() -> Result<Json<Address>> {
    Ok(Json(
        ethui_wallets::commands::wallets_get_current_address().await?,
    ))
}

pub(crate) async fn create(Json(payload): Json<ethui_types::Json>) -> Result<()> {
    ethui_wallets::commands::wallets_create(payload).await?;

    Ok(())
}

pub(crate) async fn update(
    Path(name): Path<String>,
    Json(payload): Json<ethui_types::Json>,
) -> Result<()> {
    ethui_wallets::commands::wallets_update(name, payload).await?;

    Ok(())
}

pub(crate) async fn remove(Path(name): Path<String>) -> Result<()> {
    ethui_wallets::commands::wallets_remove(name).await?;

    Ok(())
}

#[derive(Debug, Deserialize)]
pub(crate) struct SetCurrentWalletPayload {
    idx: usize,
}

pub(crate) async fn set_current_wallet(
    Json(SetCurrentWalletPayload { idx }): Json<SetCurrentWalletPayload>,
) -> Result<()> {
    ethui_wallets::commands::wallets_set_current_wallet(idx).await?;

    Ok(())
}

pub(crate) async fn set_current_path(
    Json(SetCurrentPathPayload { key }): Json<SetCurrentPathPayload>,
) -> Result<()> {
    ethui_wallets::commands::wallets_set_current_path(key).await?;

    Ok(())
}

#[derive(Debug, Deserialize)]
pub(crate) struct GetWalletAddressParams {
    name: String,
}

pub(crate) async fn get_wallet_addresses(
    Query(GetWalletAddressParams { name }): Query<GetWalletAddressParams>,
) -> Result<Json<Vec<(String, Address)>>> {
    Ok(Json(
        ethui_wallets::commands::wallets_get_wallet_addresses(name).await?,
    ))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct GetMnemonicAddressesPayload {
    mnemonic: String,
    derivation_path: String,
}

pub(crate) async fn get_mnemonic_addresses(
    Query(payload): Query<GetMnemonicAddressesPayload>,
) -> Json<Vec<(String, Address)>> {
    Json(
        ethui_wallets::commands::wallets_get_mnemonic_addresses(
            payload.mnemonic,
            payload.derivation_path,
        )
        .await,
    )
}

#[derive(Debug, Deserialize)]
pub(crate) struct ValidateMnemonicPayload {
    mnemonic: String,
}

pub(crate) async fn validate_mnemonic(
    Query(payload): Query<ValidateMnemonicPayload>,
) -> Json<bool> {
    Json(ethui_wallets::commands::wallets_validate_mnemonic(
        payload.mnemonic,
    ))
}
