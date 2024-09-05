use std::collections::HashMap;

use crate::types::{ChainlinkFeedData, ChainlinkId, PythId};
use crate::Error;
use once_cell::sync::OnceCell;
use reqwest::Client;
use serde_json::Value;

pub static CHAINLINK_FEEDS: OnceCell<HashMap<String, Vec<ChainlinkFeedData>>> = OnceCell::new();
pub static PYTH_FEEDS: OnceCell<String> = OnceCell::new();

pub async fn init() {
    let _chainlink = init_chainlink_feeds().await;
    let _pyth = init_pyth_feeds().await;
}

pub async fn init_pyth_feeds() -> Result<(), Error> {
    let url = "https://hermes.pyth.network/v2/price_feeds?asset_type=crypto";
    let response = reqwest::get(url)
        .await
        .map_err(Error::Reqwest)?
        .text()
        .await
        .map_err(Error::Reqwest)?;
    let response_json: Vec<PythId> = serde_json::from_str(&response).map_err(Error::Json)?;

    let _ = PYTH_FEEDS.set(serde_json::to_string_pretty(&response_json)?);

    Ok(())
}

pub async fn init_chainlink_feeds() -> Result<(), Error> {
    let config_str = include_str!("../../../crates/exchange-rates/data/chainlink.json");

    let response: ChainlinkId = serde_json::from_str(config_str)?;
    let client = Client::new();

    let mut accum_feeds: HashMap<String, Vec<ChainlinkFeedData>> = HashMap::new();

    for (id, network) in response.networks {
        let rdd_response = client.get(&network.rdd_url).send().await?;
        let rdd_data: Value = rdd_response.json().await?;

        let chainlink_feed: Vec<ChainlinkFeedData> = serde_json::from_value(rdd_data.clone())?;

        accum_feeds.insert(id, chainlink_feed);
    }

    let _ = CHAINLINK_FEEDS.set(accum_feeds);
    Ok(())
}
