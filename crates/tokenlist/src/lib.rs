use serde::{ Deserialize, Serialize };
use reqwest::Error;
use chrono::{ DateTime, Utc };
use std::{
    fs::File,
    io::Write,
};

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

pub async fn init() -> Result<(), Error> {

    let response = match reqwest::get("https://gateway.ipfs.io/ipns/tokens.uniswap.org").await {
        Ok(response) => response,
        Err(err) => {
            eprintln!("Error while fetching: {}", err);
            return Err(err);
        }
    };
    
    let mut token_list: TokenList = match response.json().await {
        Ok(token_list) => token_list,
        Err(err) => {
            eprintln!("Error while deserializing JSON: {}", err);
            return Err(err);
        }
    };

        // Add local timestamp
        let updated_at: DateTime<Utc> = chrono::Utc::now();
        token_list.updated_at = Some(updated_at);
       
        let updated_json = serde_json::to_string_pretty(&token_list).unwrap();

        //Create JSON file
        let mut file = File::create("list.json").expect("Failed to create list.json file");
        file.write_all(updated_json.as_bytes()).expect("Failed to write to list.json file");
    
    Ok(())
}