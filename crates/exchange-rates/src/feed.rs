use std::{fs::File, io::BufReader, path::PathBuf, sync::Arc};

use crate::types::ChainlinkFeedData;
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

    let base_asset = if base_asset == "WETH" {
        "ETH".to_string()
    } else {
        base_asset
    };
    
    let quote_asset = if quote_asset == "WETH" {
        "ETH".to_string()
    } else {
        quote_asset
    };

    let asset_path = format!(
        "{}-{}",
        base_asset.to_lowercase(),
        quote_asset.to_lowercase()
    );
    let contract_info = contracts
    .iter()
    .find(|&contract| { 
        contract.path == asset_path &&
        contract.proxy_address.is_some()
    });

    let (proxy_address, decimals) = match contract_info {
        Some(contract) => (
            contract.proxy_address.as_ref().unwrap(),
            contract.decimals,
        ),
        None => {
            eprintln!("No address found for pair -> {}", asset_path);
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
