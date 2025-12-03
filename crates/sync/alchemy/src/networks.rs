use std::collections::HashMap;

use common::eyre;
use once_cell::sync::Lazy;
use url::Url;

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
            base_url: Url::parse("https://eth-mainnet.g.alchemy.com").unwrap(),
            default_from_block: 15537393, // September 15 2022 - The Merge
        },
    );

    map.insert(
        11155111,
        Network {
            base_url: Url::parse("https://eth-sepolia.g.alchemy.com").unwrap(),
            default_from_block: 3000000, // May 1st 2023
        },
    );

    map.insert(
        137,
        Network {
            base_url: Url::parse("https://polygon-mainnet.g.alchemy.com").unwrap(),
            default_from_block: 42170000, // May 1st 2023
        },
    );

    map.insert(
        80002,
        Network {
            base_url: Url::parse("https://polygon-amoy.g.alchemy.com").unwrap(),
            default_from_block: 1, // November 19th 2023
        },
    );

    map.insert(
        42161,
        Network {
            base_url: Url::parse("https://arb-mainnet.g.alchemy.com").unwrap(),
            default_from_block: 86100000, // May 1st 2023
        },
    );

    map.insert(
        421614,
        Network {
            base_url: Url::parse("https://arb-sepolia.g.alchemy.com").unwrap(),
            default_from_block: 1, // August 22nd 2023
        },
    );

    map.insert(
        10,
        Network {
            base_url: Url::parse("https://opt-mainnet.g.alchemy.com").unwrap(),
            default_from_block: 95610000, // May 1st 2023
        },
    );

    map.insert(
        11155420,
        Network {
            base_url: Url::parse("https://opt-sepolia.g.alchemy.com").unwrap(),
            default_from_block: 1, // August 12nd 2023
        },
    );

    map.insert(
        8453,
        Network {
            base_url: Url::parse("https://base-mainnet.g.alchemy.com").unwrap(),
            default_from_block: 1, // June 15th 2023
        },
    );

    map.insert(
        84532,
        Network {
            base_url: Url::parse("https://base-sepolia.g.alchemy.com").unwrap(),
            default_from_block: 1, // September 26th 2023
        },
    );

    map.insert(
        324,
        Network {
            base_url: Url::parse("https://zksync-mainnet.g.alchemy.com").unwrap(),
            default_from_block: 1, // February 14th 2023
        },
    );

    map.insert(
        300,
        Network {
            base_url: Url::parse("https://zksync-sepolia.g.alchemy.com").unwrap(),
            default_from_block: 1, // December 1st 2023
        },
    );

    map.insert(
        534352,
        Network {
            base_url: Url::parse("https://scroll-mainnet.g.alchemy.com").unwrap(),
            default_from_block: 1, // October 1st 2024
        },
    );

    map.insert(
        534351,
        Network {
            base_url: Url::parse("https://scroll-sepolia.g.alchemy.com").unwrap(),
            default_from_block: 1, // October 1st 2024
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

pub fn get_endpoint(chain_id: u32, path: &str, api_key: &str) -> color_eyre::Result<reqwest::Url> {
    let endpoint = match get_network(&chain_id) {
        Some(network) => network.base_url,
        None => return Err(eyre!("Unsupported chain id: {}", chain_id)),
    };

    Ok(endpoint.join(path)?.join(api_key)?)
}
