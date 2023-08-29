mod feed;
mod init;

use std::collections::HashMap;

use feed::Feed;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct Feeds {
    // Tuple structure: (network, currency, token symbol)
    feeds: HashMap<(u64, String, String), Vec<Feed>>,
}
