use std::{fs, fs::File, io::Write, path::Path};

use anyhow::Result;
use chrono::{Duration, Utc};
use reqwest::blocking;
use serde::{Deserialize, Serialize};

const FILE: &str = "../../packages/data/gen/tokens.json";
const URI: &str = "https://tokens.1inch.eth.link/";

const CHAIN_ID_WHITELIST: [i32; 3] = [1, 137, 10];

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
    if !Path::new(FILE).exists() {
        return Ok(true);
    }

    let metadata = fs::metadata(FILE)?;
    if let Ok(modified) = metadata.modified() {
        let modified_date = modified
            .duration_since(std::time::UNIX_EPOCH)
            .expect("time went backwards")
            .as_secs();
        let one_month_ago = (Utc::now() - Duration::try_days(30).unwrap()).timestamp() as u64;

        return Ok(modified_date < one_month_ago);
    }

    Ok(true)
}

fn update() -> Result<()> {
    let tokens: Vec<Token> = blocking::get(URI)?
        .json::<TokenList>()?
        .tokens
        .into_iter()
        .filter(|token| CHAIN_ID_WHITELIST.contains(&token.chain_id))
        .collect();

    let updated_json = serde_json::to_string_pretty(&tokens)?;

    let mut file = File::create(FILE)?;
    file.write_all(updated_json.as_bytes())?;

    Ok(())
}
