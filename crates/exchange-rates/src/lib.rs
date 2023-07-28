mod chainlink;
mod feed;
mod init;

pub use init::init;

use feed::Feed;
use serde::Deserialize;
use std::collections::HashMap;

#[derive(Debug, Deserialize)]
pub struct Feeds {
    // Tuple structure: (network, currency, token symbol)
    feeds: HashMap<(String, String, String), Vec<Feed>>,
}
