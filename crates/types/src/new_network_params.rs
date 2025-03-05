use serde::{Deserialize, Serialize};
use url::Url;

use crate::Network;

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct NewNetworkParams {
    pub name: String,
    pub chain_id: u32,
    pub explorer_url: Option<String>,
    pub http_url: Url,
    pub ws_url: Option<Url>,
    pub currency: String,
    pub decimals: u32,
}

impl NewNetworkParams {
    pub fn into_network(self, deduplication_id: u32) -> Network {
        Network {
            deduplication_id,
            name: self.name,
            chain_id: self.chain_id,
            explorer_url: self.explorer_url,
            http_url: self.http_url,
            ws_url: self.ws_url,
            currency: self.currency,
            decimals: self.decimals,
        }
    }
}
