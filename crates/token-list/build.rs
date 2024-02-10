use std::{fs, fs::File, io::Write, path::Path};

use anyhow::Result;
use chrono::{Duration, Utc};
use reqwest::blocking;
use serde::{Deserialize, Serialize};

const TOKEN_LIST: &str = "token_list.json";
const TOKEN_LIST_URI: &str = "https://tokens.1inch.eth.link/";

#[derive(Debug, Deserialize, Serialize)]
pub struct TokenList {
    tokens: Vec<Token>,
}

#[derive(Deserialize, Debug, Serialize)]
pub struct Token {
    #[serde(rename = "chainId")]
    chain_id: i32,
    address: String,
    name: String,
    symbol: String,
}

pub fn main() {
    if let Ok(true) = should_update() {
        update().expect("Failed to create json");
    }
}

fn should_update() -> Result<bool> {
    if !Path::new(TOKEN_LIST).exists() {
        return Ok(true);
    }

    let metadata = fs::metadata(TOKEN_LIST)?;
    if let Ok(modified) = metadata.modified() {
        let modified_date = modified
            .duration_since(std::time::UNIX_EPOCH)
            .expect("time went backwards")
            .as_secs();
        let one_month_ago = (Utc::now() - Duration::days(30)).timestamp() as u64;

        return Ok(modified_date < one_month_ago);
    }

    Ok(true)
}

fn update() -> Result<()> {
    let token_list: TokenList = blocking::get(TOKEN_LIST_URI)?.json()?;
    let updated_json = serde_json::to_string_pretty(&token_list)?;

    let mut file = File::create(TOKEN_LIST)?;
    file.write_all(updated_json.as_bytes())?;

    Ok(())
}
