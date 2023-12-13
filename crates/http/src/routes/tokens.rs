use axum::{
    extract::Query,
    handler::get,
    response::Json,
    Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use crate::{Ctx, Result};

#[derive(Debug, Deserialize, Serialize )]
pub struct TokenList {
    updated_at: Option<DateTime<Utc>>,
    name: String,
    tokens: Vec<Token>,
}

#[derive(Deserialize, Debug, Serialize)]
pub struct Token {
    #[serde(rename = "chainId")]
    chain_id: i32,
    
    address: String,
    name: String,
    //symbol: String,
    //decimals: i32,

    #[serde(rename = "logoURI")]
    logo_uri: String,
}

pub(super) fn router() -> Router<Ctx> {
    Router::new()
        .route("/tokens", get(hello))
        //.route("/tokenpair/:chain_id/:address", get(check_id_address_pair))
}

pub fn hello() {
    println!("HELLO THERE!!!!!!!!!!!!")
}

/*
pub fn check_id_address_pair(
    token_list: &TokenList,
    target_chain_id: i32,
    target_address: &str,
) -> Option<&Token> {
    token_list
        .tokens
        .iter()
        .find(|token| token.chain_id == target_chain_id && token.address == target_address)
}

pub fn get_logo_uri_by_id_and_address(
    token_list: &TokenList,
    target_chain_id: i32,
    target_address: String,
) -> Option<String> {
    check_id_address_pair(token_list, target_chain_id, target_address)
        .map(|token| &token.logo_uri)
}

pub async fn get_token_handler(Query((target_chain_id, target_address)): Query<(i32, String)>, token_list: Arc<TokenList>) -> Json<Option<&Token>> {
    let result = check_id_address_pair(&token_list, target_chain_id, target_address);
    Json(result)
}
*/
