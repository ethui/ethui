use anyhow::{anyhow, Ok, Result};
use chrono::{DateTime, Duration, Utc};
use reqwest::blocking;
use serde::{Deserialize, Serialize};
//use serde_json::Value;
use std::{fs, fs::File, io::Write, path::Path};

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
    let path_to_json = "list.json";
    let does_file_exist = Path::new("list.json").exists();

    if !does_file_exist {
        create_json().ok();
    } else {
        let file_string = fs::read_to_string(path_to_json)?;
        let list_to_json_value: TokenList = serde_json::from_str(&file_string)?;
        let check_updated_at = list_to_json_value.updated_at;
        let current_date_minus_30_days = Utc::now() - Duration::days(30);
        let older_than_one_month: bool = check_updated_at.unwrap() < current_date_minus_30_days;

        if older_than_one_month {
            create_json().ok();
        }
    }

    Ok(())
}

fn create_json() -> Result<()> {
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
