use std::str::FromStr;

use ethers::{
    etherscan,
    providers::{Http, Middleware, Provider},
    types::{Address, Chain},
};

pub async fn test_alchemy_api_key(key: String) -> bool {
    let provider =
        match Provider::<Http>::try_from(format!("https://eth-mainnet.g.alchemy.com/v2/{}", key)) {
            Ok(p) => p,
            _ => return false,
        };

    let res = provider.get_block_number().await;

    res.is_ok()
}

pub async fn test_etherscan_api_key(key: String) -> bool {
    let client = etherscan::Client::builder()
        .with_api_key(&key)
        .chain(Chain::Mainnet)
        .unwrap()
        .build()
        .unwrap();

    client
        .contract_abi(Address::from_str("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48").unwrap())
        .await
        .is_ok()
}
