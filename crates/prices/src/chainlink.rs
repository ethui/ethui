use serde::Deserialize;

#[derive(Deserialize, Debug, Clone)]
pub struct ChainlinkFeed {
    pub address: String,
}
