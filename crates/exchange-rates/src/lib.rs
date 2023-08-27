mod feed;
mod init;

use feed::Feed;
use serde::Deserialize;
use std::collections::HashMap;

#[derive(Debug, Deserialize)]
pub struct Feeds {
    // Tuple structure: (network, currency, token symbol)
    feeds: HashMap<(u64, String, String), Vec<Feed>>,
}
