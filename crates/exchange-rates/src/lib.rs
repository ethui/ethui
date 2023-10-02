pub mod commands;
mod chainlink;
mod feed;
mod init;

use feed::Feed;
use serde::Deserialize;
use std::collections::HashMap;

#[derive(Debug, Deserialize)]
pub struct Feeds {
    // Tuple structure: (network, currency, token symbol)
    feeds: HashMap<(u64, String, String), Vec<Feed>>,
    // Map structure: key<network>, value<rpc address list>
    rpcs: HashMap<u64, Vec<String>>,
}

impl Feeds {
    async fn get_prices(&self, params: serde_json::Value) -> Option<i128> {
        let network = params["network"].as_u64().unwrap();
        let currency = params["currency"].as_str().unwrap().to_string();
        let token = params["token"].as_str().unwrap().to_string();
        let feeds = &self.feeds[&(network, currency.clone(), token.clone())];
        let rpcs = &self.rpcs[&network];
        for feed in feeds {
            if let Some(res) = feed.get_feed_price(rpcs).await {
                return Some(res)
            }
        }
        None
    }
}
