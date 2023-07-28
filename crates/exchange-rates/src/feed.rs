use serde::Deserialize;

use super::chainlink::ChainlinkFeed;

#[derive(Debug, Deserialize)]
#[serde(tag = "provider", rename_all = "camelCase")]
pub enum Feed {
    Chainlink(ChainlinkFeed),
}
