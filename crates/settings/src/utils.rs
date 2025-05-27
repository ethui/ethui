use alloy::providers::{Provider as _, ProviderBuilder};
use alloy_chains::Chain;

pub async fn test_alchemy_api_key(key: String) -> bool {
    let rpc_url = match format!("https://eth-mainnet.g.alchemy.com/v2/{key}").parse() {
        Ok(p) => p,
        Err(_) => return false,
    };

    let provider = ProviderBuilder::new().connect_http(rpc_url);
    let res = provider.get_block_number().await;

    res.is_ok()
}

pub async fn test_etherscan_api_key(key: String) -> bool {
    let client = match foundry_block_explorers::Client::new(Chain::mainnet(), key) {
        Ok(c) => c,
        _ => return false,
    };

    let address = match "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48".parse() {
        Ok(p) => p,
        Err(_) => return false,
    };

    client.contract_source_code(address).await.is_ok()
}
