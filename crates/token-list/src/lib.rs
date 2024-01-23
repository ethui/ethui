use std::{
    fs,
    fs::File,
    io::{BufReader, Write},
    path::Path,
};

use chrono::{DateTime, Duration, Utc};
use reqwest::blocking;
use serde::{Deserialize, Serialize};

const TOKEN_LIST: &str = "token_list.json";
const TOKEN_LIST_URI: &str = "https://gateway.ipfs.io/ipns/tokens.uniswap.org";

#[derive(thiserror::Error, Debug)]
pub enum TokenListError {
    #[error("HTTP request failed.")]
    FailedRequest,
    #[error("Failed to serialize JSON.")]
    FailedToSerialize,
    #[error("Failed to deserialize JSON.")]
    FailedToDeserialize,
    #[error("Failed to create file.")]
    FailedToCreateFile,
    #[error("Failed to open file.")]
    FailedToOpenFile,
    #[error("Failed to read file.")]
    FailedToReadFile,
    #[error("Failed to write file.")]
    FailedToWriteFile,
    #[error("updated_at field doesn't exist.")]
    FieldNotFound,
    #[error("Token not found.")]
    TokenNotFound,
}

#[derive(Debug, Deserialize, Serialize)]
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
    #[serde(rename = "logoURI")]
    logo_uri: String,
}

pub fn build() {
    if let Err(err) = init() {
        panic!("Tokenlist Error: {}", err);
    }
}

fn init() -> Result<(), TokenListError> {
    let does_file_exist = Path::new(TOKEN_LIST).exists();

    if !does_file_exist || is_older_than_one_month()? {
        create_json()?;
    }

    Ok(())
}

fn is_older_than_one_month() -> Result<bool, TokenListError> {
    let file_string =
        fs::read_to_string(TOKEN_LIST).map_err(|_| TokenListError::FailedToReadFile)?;
    let list_to_json_value: TokenList =
        serde_json::from_str(&file_string).map_err(|_| TokenListError::FailedToDeserialize)?;
    let check_updated_at = list_to_json_value
        .updated_at
        .ok_or(TokenListError::FieldNotFound)?;
    let current_date_minus_30_days = Utc::now() - Duration::days(30);
    let older_than_one_month: bool = check_updated_at < current_date_minus_30_days;

    Ok(older_than_one_month)
}

fn create_json() -> Result<(), TokenListError> {
    let mut token_list: TokenList = blocking::get(TOKEN_LIST_URI)
        .map_err(|_| TokenListError::FailedRequest)?
        .error_for_status()
        .map_err(|_| TokenListError::FailedRequest)?
        .json()
        .map_err(|_| TokenListError::FailedRequest)?;

    let updated_at: DateTime<Utc> = chrono::Utc::now();
    token_list.updated_at = Some(updated_at);
    let updated_json =
        serde_json::to_string_pretty(&token_list).map_err(|_| TokenListError::FailedToSerialize)?;

    File::create(TOKEN_LIST)
        .map_err(|_| TokenListError::FailedToCreateFile)?
        .write_all(updated_json.as_bytes())
        .map_err(|_| TokenListError::FailedToWriteFile)?;

    Ok(())
}

fn get_token_list() -> Result<TokenList, TokenListError> {
    let file = File::open(TOKEN_LIST).map_err(|_| TokenListError::FailedToOpenFile)?;
    let reader = BufReader::new(file);

    serde_json::from_reader(reader).map_err(|_| TokenListError::FailedToDeserialize)
}

pub fn get_token(chain_id: i32, address: String) -> Result<Token, TokenListError> {
    get_token_list()
        .map_err(|_| TokenListError::TokenNotFound)?
        .tokens
        .into_iter()
        .find(|token| token.chain_id == chain_id && token.address == address)
        .ok_or(TokenListError::TokenNotFound)
}
