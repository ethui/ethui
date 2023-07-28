use serde::Deserialize;

#[derive(Deserialize, Debug, Clone)]
pub struct ChainlinkFeed {
    address: String,
}
