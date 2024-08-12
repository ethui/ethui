use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ChainlinkIdData {
    pub rdd_url: String,
}

#[derive(Deserialize, Debug)]
pub struct ChainlinkId {
    #[serde(flatten)]
    pub networks: HashMap<String, ChainlinkIdData>,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ChainlinkFeedData {
    pub contract_address: String,
    pub multiply: String,
    pub name: String,
    pub path: String,
    pub proxy_address: Option<String>,
    pub feed_category: String,
    pub feed_type: String,
    pub decimals: u8,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct PythIdData {
    pub base: String,
    pub description: String,
    pub generic_symbol: String,
    pub quote_currency: String,
    pub symbol: String,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PythId {
    pub id: String,
    pub attributes: PythIdData,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct PythFeedData {
    pub id: String,
    pub price: PythPriceData,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct PythPriceData {
    pub price: String,
    pub conf: String,
    pub expo: i32,
    pub publish_time: u64,
}
