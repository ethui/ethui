use std::{fs, fs::File, io::Write, path::Path};

use chrono::{DateTime, Duration, Utc};
use reqwest::blocking;
use serde::{Deserialize, Serialize};

const TOKEN_LIST: &str = "token_list.json";
const TOKEN_LIST_URI: &str = "https://gateway.ipfs.io/ipns/tokens.uniswap.org";

#[derive(thiserror::Error, Debug)]
pub enum TokenListError {
    #[error("GET request failed.")]
    FailedRequest(#[from] reqwest::Error),
    #[error("Failed to serialize JSON.")]
    FailedToSerialize(#[from] serde_json::Error),
    #[error("Failed to create file.")]
    FailedToCreateFile(#[from] std::io::Error),
    #[error("updated_at field doesn't exist.")]
    FieldNotFound,
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
    let file_string = fs::read_to_string(TOKEN_LIST)?;
    let list_to_json_value: TokenList = serde_json::from_str(&file_string)?;
    let check_updated_at = list_to_json_value
        .updated_at
        .ok_or(TokenListError::FieldNotFound)?;
    let current_date_minus_30_days = Utc::now() - Duration::days(30);
    let older_than_one_month: bool = check_updated_at < current_date_minus_30_days;

    Ok(older_than_one_month)
}

fn create_json() -> Result<(), TokenListError> {
    let response = blocking::get(TOKEN_LIST_URI)?;
    let checked_response = response.error_for_status()?;

    let mut token_list: TokenList = checked_response.json()?;

    let updated_at: DateTime<Utc> = chrono::Utc::now();
    token_list.updated_at = Some(updated_at);

    let updated_json = serde_json::to_string_pretty(&token_list)?;

    let mut file = File::create(TOKEN_LIST)?;
    file.write_all(updated_json.as_bytes())?;

    Ok(())
}
