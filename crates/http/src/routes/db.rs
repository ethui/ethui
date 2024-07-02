use axum::{
    extract::{Query, State},
    routing::{get, post},
    Json, Router,
};
use ethers::{abi::Abi, types::Chain};
use ethui_db::{
    utils::{fetch_etherscan_abi, fetch_etherscan_contract_name},
    Paginated, Pagination,
};
use ethui_types::{
    transactions::PaginatedTx, Address, Contract, Erc721TokenData, TokenBalance, UINotify, U256,
};
use serde::Deserialize;

use crate::{Ctx, Error, Result};

pub(super) fn router() -> Router<Ctx> {
    Router::new()
        .route("/transactions", get(transactions))
        .route("/erc20_balances", get(erc20_balances))
        .route("/erc20_denylist_balances", get(erc20_denylist_balances)) // NEW
        .route("/native_balance", get(native_balance))
        .route("/contracts", get(contracts))
        .route("/contract_abi", get(contract_abi))
        .route("/insert_contract", post(insert_contract))
        .route("/erc721_tokens", get(erc721_tokens))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TransactionsPayload {
    address: Address,
    chain_id: u32,
    pagination: Option<Pagination>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AddressChainIdPayload {
    address: Address,
    chain_id: u32,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ChainIdPayload {
    chain_id: u32,
}

pub(crate) async fn transactions(
    State(Ctx { db }): State<Ctx>,
    Query(TransactionsPayload {
        address,
        chain_id,
        pagination,
    }): Query<TransactionsPayload>,
) -> Result<Json<Paginated<PaginatedTx>>> {
    Ok(Json(
        db.get_transactions(chain_id, address, pagination.unwrap_or_default())
            .await?,
    ))
}

pub(crate) async fn erc20_balances(
    State(Ctx { db }): State<Ctx>,
    Query(AddressChainIdPayload { chain_id, address }): Query<AddressChainIdPayload>,
) -> Result<Json<Vec<TokenBalance>>> {
    Ok(Json(db.get_erc20_balances(chain_id, address, false).await?))
}

/* NEW */
pub(crate) async fn erc20_denylist_balances(
  State(Ctx { db }): State<Ctx>,
  Query(AddressChainIdPayload { chain_id, address }): Query<AddressChainIdPayload>,
) -> Result<Json<Vec<TokenBalance>>> {
  Ok(Json(db.get_erc20_denylist_balances(chain_id, address, false).await?))
}

pub(crate) async fn native_balance(
    State(Ctx { db }): State<Ctx>,
    Query(AddressChainIdPayload { chain_id, address }): Query<AddressChainIdPayload>,
) -> Result<Json<U256>> {
    Ok(Json(db.get_native_balance(chain_id, address).await))
}

pub(crate) async fn contracts(
    State(Ctx { db }): State<Ctx>,
    Query(ChainIdPayload { chain_id }): Query<ChainIdPayload>,
) -> Result<Json<Vec<Contract>>> {
    Ok(Json(db.get_contracts(chain_id).await?))
}

pub(crate) async fn contract_abi(
    State(Ctx { db }): State<Ctx>,
    Query(AddressChainIdPayload { chain_id, address }): Query<AddressChainIdPayload>,
) -> Result<Json<Abi>> {
    Ok(Json(db.get_contract_abi(chain_id, address).await?))
}

pub(crate) async fn insert_contract(
    State(Ctx { db }): State<Ctx>,
    Json(AddressChainIdPayload { chain_id, address }): Json<AddressChainIdPayload>,
) -> Result<()> {
    let chain = Chain::try_from(chain_id).map_err(|_| Error::InvalidChainId(chain_id))?;
    let name = fetch_etherscan_contract_name(chain, address).await?;
    let abi = fetch_etherscan_abi(chain, address)
        .await?
        .map(|abi| serde_json::to_string(&abi).unwrap());

    db.insert_contract_with_abi(chain_id, address, abi, name)
        .await?;

    ethui_broadcast::ui_notify(UINotify::ContractsUpdated).await;

    Ok(())
}

pub(crate) async fn erc721_tokens(
    State(Ctx { db }): State<Ctx>,
    Query(AddressChainIdPayload { chain_id, address }): Query<AddressChainIdPayload>,
) -> Result<Json<Vec<Erc721TokenData>>> {
    Ok(Json(db.get_erc721_tokens(chain_id, address).await?))
}
