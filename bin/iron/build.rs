use anyhow::{anyhow, bail, Result};
use chrono::{DateTime, Utc};
use reqwest::blocking;
use serde::{Deserialize, Serialize};
use std::{error::Error, fs::File, io::Write};

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
    //symbol: String,
    //decimals: i32,
    #[serde(rename = "logoURI")]
    logo_uri: String,
}

pub fn init() -> Result<()> {
    let response = blocking::get("https://gateway.ipfs.io/ipns/tokens.uniswap.org")
        .map_err(|err| anyhow!(err))?;

    let mut token_list: TokenList = response.json().map_err(|err| anyhow!(err))?;

    // Add local timestamp
    let updated_at: DateTime<Utc> = chrono::Utc::now();
    token_list.updated_at = Some(updated_at);

    let updated_json = serde_json::to_string_pretty(&token_list)?;

    //Create JSON file
    let mut file = File::create("list.json")?;
    file.write_all(updated_json.as_bytes())?;

    Ok(())
}

fn main() -> Result<()> {
    init()?;
    tauri_build::build();

    Ok(())
}
