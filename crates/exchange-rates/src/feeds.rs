use std::{fs::File, io::BufReader, path::PathBuf, sync::Arc};

use crate::{types::{ChainlinkFeedData, PythFeedData, PythId}, utils::get_asset_match};
use ethers::types::{Address, I256};
use ethui_abis::ChainlinkAgregatorV3;
use ethui_networks::Networks;
use ethui_types::GlobalState;

pub async fn get_chainlink_price(base_asset: String, quote_asset: String) -> I256 {
    let networks = Networks::read().await;
    let network = networks.get_current();
    let current_chain_id = network.chain_id;
    let provider = network.get_provider();
    let client = Arc::new(provider);

    let filename = format!("{}.json", current_chain_id);
    let base_path = PathBuf::from("../target/exchange-rates/chainlink/");
    let file_path = base_path.join(&filename);
    let file = match File::open(&file_path) {
        Ok(file) => file,
        Err(e) => {
            eprintln!("Failed to open file {}: {e}", filename);
            return I256::from(0);
        }
    };

    let reader = BufReader::new(file);
    let contracts: Vec<ChainlinkFeedData> = match serde_json::from_reader(reader) {
        Ok(contracts) => contracts,
        Err(e) => {
            eprintln!("Failed to parse JSON: {e}");
            return I256::from(0);
        }
    };

    let (base_asset, quote_asset) = get_asset_match(base_asset, quote_asset);

    let asset_path = format!(
        "{}-{}",
        base_asset.to_lowercase(),
        quote_asset.to_lowercase()
    );
    let contract_info = contracts
        .iter()
        .find(|&contract| contract.path == asset_path && contract.proxy_address.is_some());

    let (proxy_address, decimals) = match contract_info {
        Some(contract) => (contract.proxy_address.as_ref().unwrap(), contract.decimals),
        None => {
            return I256::from(0);
        }
    };

    let address: Address = match proxy_address.parse() {
        Ok(value) => value,
        Err(e) => {
            eprintln!("Invalid address: {e}");
            return I256::from(0);
        }
    };

    let contract = ChainlinkAgregatorV3::new(address, client);

    if let Ok(round_data) = contract.latest_round_data().call().await {
        let price: I256 = round_data.1 / I256::exp10((decimals - 6) as usize);
        return price;
    }
    I256::from(0)
}

pub async fn get_pyth_price(base_asset: String, quote_asset: String) -> I256 {
    let filename = "pyth.json".to_string();
    let base_path = PathBuf::from("../target/exchange-rates/pyth/");
    let file_path = base_path.join(&filename);
    let file = match File::open(&file_path) {
        Ok(file) => file,
        Err(e) => {
            eprintln!("Failed to open file {}: {e}", filename);
            return I256::from(0);
        }
    };

    let reader = BufReader::new(file);
    let feed_ids: Vec<PythId> = match serde_json::from_reader(reader) {
        Ok(ids) => ids,
        Err(e) => {
            eprintln!("Failed to parse JSON: {e}");
            return I256::from(0);
        }
    };

    let (base_asset, quote_asset) = get_asset_match(base_asset, quote_asset);

    let asset_symbol = format!(
        "Crypto.{}/{}",
        base_asset.to_uppercase(),
        quote_asset.to_uppercase()
    );
    let contract_info = feed_ids
        .iter()
        .find(|&contract| contract.attributes.symbol == asset_symbol);

    let id_address = match contract_info {
        Some(contract) => &contract.id,
        None => {
            return I256::from(0);
        }
    };

    let api_url = format!(
        "https://hermes.pyth.network/v2/updates/price/latest?ids%5B%5D={}&encoding=hex&parsed=true",
        id_address
    );

    let response = match reqwest::get(api_url).await {
        Ok(response) => response,
        Err(e) => {
            eprintln!("Failed to fetch price data: {}", e);
            return I256::from(0);
        }
    };

    let response_text = match response.text().await {
        Ok(text) => text,
        Err(e) => {
            eprintln!("Failed to read response text: {}", e);
            return I256::from(0);
        }
    };

    let response_json: PythFeedData = match serde_json::from_str(&response_text) {
        Ok(data) => data,
        Err(e) => {
            eprintln!("Failed to deserialize response: {}", e);
            return I256::from(0);
        }
    };

    if let Some(parsed_data) = response_json.parsed.first() {
        let price_data = &parsed_data.price;
        let parsed_price: I256 = I256::from_dec_str(&price_data.price).unwrap();
        let decimals: i32 = price_data.expo;

        let price: I256 = parsed_price / I256::exp10((-decimals - 6) as usize);
        price
    } else {
        eprintln!("No parsed data found.");
        I256::from(0)
    }
}
