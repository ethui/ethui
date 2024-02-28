use std::collections::HashMap;
use std::time::Duration;

use ethers::providers::{
    Http, HttpRateLimitRetryPolicy, Provider, RetryClient, RetryClientBuilder,
};
use once_cell::sync::Lazy;
use url::Url;

use crate::{Error, Result};

#[derive(Debug, Clone)]
pub struct Network {
    pub base_url: Url,
    pub default_from_block: u64,
}

pub static NETWORKS: Lazy<HashMap<u32, Network>> = Lazy::new(|| {
    let mut map: HashMap<u32, Network> = Default::default();

    map.insert(
        1,
        Network {
            base_url: Url::parse("https://eth-mainnet.g.alchemy.com/v2/").unwrap(),
            default_from_block: 15537393, // September 15 2022 - The Merge
        },
    );

    map.insert(
        5,
        Network {
            base_url: Url::parse("https://eth-goerli.g.alchemy.com/v2/").unwrap(),
            default_from_block: 7245414, // July 18th 2022
        },
    );

    map.insert(
        11155111,
        Network {
            base_url: Url::parse("https://eth-sepolia.g.alchemy.com/v2/").unwrap(),
            default_from_block: 3000000, // May 1st 2023
        },
    );

    map
});

pub fn supports_network(chain_id: u32) -> bool {
    NETWORKS.get(&chain_id).is_some()
}

pub fn get_network(chain_id: &u32) -> Option<Network> {
    NETWORKS.get(chain_id).cloned()
}

pub fn default_from_block(chain_id: u32) -> u64 {
    NETWORKS
        .get(&chain_id)
        .map(|network| network.default_from_block)
        .unwrap_or(0)
}

pub fn get_endpoint(chain_id: u32, api_key: &str) -> Result<Url> {
    let endpoint = match get_network(&chain_id) {
        Some(network) => network.base_url,
        None => return Err(Error::UnsupportedChainId(chain_id)),
    };

    Ok(endpoint.join(&api_key)?)
}
