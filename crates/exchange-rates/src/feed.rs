use ethers::types::Address;
use serde::Deserialize;

use super::chainlink;
use crate::Feed::Chainlink;

#[derive(Debug, Deserialize)]
#[serde(tag = "provider", rename_all = "camelCase", content = "address")]
pub enum Feed {
    Chainlink(Address),
}

impl Feed {
    pub async fn get_feed_price<'a>(&self, rpcs: &'a Vec<String>) -> Option<i128> {
        match &self {
            Chainlink(address) => chainlink::get_feed_price(address, rpcs).await,
        }
    }
}
