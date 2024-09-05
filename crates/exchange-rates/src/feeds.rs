use std::sync::Arc;

use crate::init::{CHAINLINK_FEEDS, PYTH_FEEDS};
use crate::Error;
use crate::{
    types::{PythFeedData, PythId},
    utils::get_asset_match,
};
use ethers::types::{Address, I256};
use ethui_abis::ChainlinkAgregatorV3;
use ethui_networks::Networks;
use ethui_types::GlobalState;

pub async fn get_chainlink_price(base_asset: String, quote_asset: String) -> Result<I256, Error> {
    let networks = Networks::read().await;
    let network = networks.get_current();
    let current_chain_id = network.chain_id;
    let provider = network.get_provider();
    let client = Arc::new(provider);

    let feeds = CHAINLINK_FEEDS.get().unwrap();
    let contracts = match feeds.get(&current_chain_id.to_string()) {
        Some(contracts) => contracts,
        None => {
            return Err(Error::InvalidChain(current_chain_id));
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
            return Err(Error::InvalidPair(asset_path));
        }
    };

    let address: Address = proxy_address.parse().unwrap();

    let contract = ChainlinkAgregatorV3::new(address, client);

    if let Ok(round_data) = contract.latest_round_data().call().await {
        let price: I256 = round_data.1 / I256::exp10((decimals - 6) as usize);
        return Ok(price);
    }
    Err(Error::InvalidPrice(asset_path))
}

pub async fn get_pyth_price(base_asset: String, quote_asset: String) -> Result<I256, Error> {
    let feed_ids: Vec<PythId> = serde_json::from_str(PYTH_FEEDS.get().unwrap())?;
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
            return Err(Error::InvalidPair(asset_symbol));
        }
    };

    let api_url = format!(
        "https://hermes.pyth.network/v2/updates/price/latest?ids%5B%5D={}&encoding=hex&parsed=true",
        id_address
    );

    let response = reqwest::get(api_url).await?;
    let response_text = response.text().await;

    let response_json: PythFeedData = serde_json::from_str(&response_text.unwrap())?;

    if let Some(parsed_data) = response_json.parsed.first() {
        let price_data = &parsed_data.price;
        let parsed_price: I256 = I256::from_dec_str(&price_data.price).unwrap();
        let decimals: i32 = price_data.expo;

        let price: I256 = parsed_price / I256::exp10((-decimals - 6) as usize);
        Ok(price)
    } else {
        Err(Error::InvalidPrice(asset_symbol))
    }
}
