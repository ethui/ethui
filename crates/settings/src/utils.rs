use alloy::{
    providers::{Provider as _, ProviderBuilder},
    transports::{RpcError, TransportErrorKind},
};
use alloy_chains::Chain;
use color_eyre::{Result, eyre::eyre};

pub async fn test_alchemy_api_key(key: &str) -> Result<()> {
    let rpc_url = format!("https://eth-mainnet.g.alchemy.com/v2/{key}").parse()?;
    let provider = ProviderBuilder::new().connect_http(rpc_url);
    match provider.get_block_number().await {
        Ok(_block) => Ok(()),

        Err(RpcError::Transport(TransportErrorKind::HttpError(e))) => {
            let msg = serde_json::from_str::<serde_json::Value>(&e.body)
                .ok()
                .and_then(|e| e["error"]["message"].as_str().map(|m| m.to_string()));

            Err(eyre!("{}", msg.unwrap_or("Invalid API key or connection failed".into())))
        }

        Err(_e) => Err(eyre!("Failed to connect")),
    }
}

pub async fn test_etherscan_api_key(key: &str) -> Result<()> {
    let client = foundry_block_explorers::Client::new(Chain::mainnet(), key)?;
    let address = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48".parse()?;

    client.contract_source_code(address).await?;
    Ok(())
}
