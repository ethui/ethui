use alloy::providers::{Provider as _, ProviderBuilder};
use alloy_chains::Chain;
use color_eyre::Result;

pub async fn test_alchemy_api_key(key: &str) -> Result<()> {
    let rpc_url = format!("https://eth-mainnet.g.alchemy.com/v2/{key}").parse()?;
    let provider = ProviderBuilder::new().connect_http(rpc_url);
    let res = provider.get_block_number().await;

    Ok(res.map(|_| ())?)
}

pub async fn test_etherscan_api_key(key: &String) -> Result<()> {
    let client = foundry_block_explorers::Client::new(Chain::mainnet(), key)?;
    let address = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48".parse()?;

    Ok(client.contract_source_code(address).await.map(|_| ())?)
}
