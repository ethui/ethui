use std::collections::HashMap;

use once_cell::sync::Lazy;
use url::Url;

use crate::error::{Error, Result};

pub static SAFE_URLS: Lazy<HashMap<u32, Url>> = Lazy::new(|| {
    let mut map: HashMap<u32, Url> = Default::default();

    map.insert(
        1,
        Url::parse("https://safe-transaction-mainnet.safe.global").unwrap(),
    );

    map.insert(
        10,
        Url::parse("https://safe-transaction-optimism.safe.global").unwrap(),
    );

    map.insert(
        56,
        Url::parse("https://safe-transaction-bsc.safe.global").unwrap(),
    );

    map.insert(
        100,
        Url::parse("https://safe-transaction-gnosis-chain.safe.global").unwrap(),
    );

    map.insert(
        137,
        Url::parse("https://safe-transaction-polygon.safe.global").unwrap(),
    );

    map.insert(
        324,
        Url::parse("https://safe-transaction-zksync.safe.global").unwrap(),
    );

    map.insert(
        1101,
        Url::parse("https://safe-transaction-zkevm.safe.global").unwrap(),
    );

    map.insert(
        8453,
        Url::parse("https://safe-transaction-base.safe.global").unwrap(),
    );

    map.insert(
        42161,
        Url::parse("https://safe-transaction-arbitrum.safe.global").unwrap(),
    );

    map.insert(
        42220,
        Url::parse("https://safe-transaction-celo.safe.global").unwrap(),
    );

    map.insert(
        43114,
        Url::parse("https://safe-transaction-avalanche.safe.global").unwrap(),
    );

    map.insert(
        534352,
        Url::parse("https://safe-transaction-scroll.safe.global").unwrap(),
    );

    map.insert(
        84532,
        Url::parse("https://safe-transaction-base-sepolia.safe.global").unwrap(),
    );

    map.insert(
        11155111,
        Url::parse("https://safe-transaction-sepolia.safe.global").unwrap(),
    );

    map.insert(
        1313161554,
        Url::parse("https://safe-transaction-celo.safe.global").unwrap(),
    );

    map
});

pub fn safe_supports_network(chain_id: u32) -> bool {
    SAFE_URLS.get(&chain_id).is_some()
}

pub fn get_safe_endpoint(chain_id: u32) -> Result<Url> {
    let safe_url = match SAFE_URLS.get(&chain_id) {
        Some(url) => url,
        None => return Err(Error::UnsupportedChainId(chain_id)),
    };
    Ok(safe_url.clone())
}
