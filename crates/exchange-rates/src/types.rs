use std::collections::HashMap;
use serde::Deserialize;
use serde_json::Value;

#[derive(Debug, Deserialize)]
pub struct Feeds {
    pub feeds: HashMap<String, Value>,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ChainlinkConfig {
    pub rdd_url: String,
}

#[derive(Deserialize, Debug)]
pub struct ChainlinkId {
    #[serde(flatten)]
    pub networks: HashMap<String, ChainlinkConfig>,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AssetsPair {
    pub base_asset: String,
    pub quote_asset: String,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ChainlinkFeedData {
    pub contract_address: String,
    pub multiply: String,
    pub name: String,
    pub path: String,
    pub proxy_address: String,
    pub feed_category: String,
    pub feed_type: String,
    pub docs: AssetsPair,
    pub decimals: String,
}
