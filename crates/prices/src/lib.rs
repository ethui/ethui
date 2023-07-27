mod chainlink;
mod error;
mod feed;
mod init;

pub use init::init;

use feed::Feed;
use serde::Deserialize;
use std::collections::HashMap;

#[derive(Deserialize, Debug)]
pub struct Feeds {
    // Structure for feed discovery: network -> currency -> asset
    feeds: HashMap<String, HashMap<String, HashMap<String, Vec<Feed>>>>,
}

impl Feeds {
    fn get_feeds(&self, params: serde_json::Value) -> &Vec<Feed> {
        let network = params["networks"].to_string();
        let currency = params["currency"].to_string();
        let asset = params["asset"].to_string();
        &self.feeds[&network][&currency][&asset]
    }
}
