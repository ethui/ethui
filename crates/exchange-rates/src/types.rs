use std::collections::HashMap;
use serde::{Deserialize, Serialize};

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
