use alloy::{json_abi::JsonAbi, primitives::Address};
use alloy_chains::Chain;
use color_eyre::eyre::ContextCompat as _;
use ethui_settings::{ask, GetSettings};
use foundry_block_explorers::errors::EtherscanError;

pub async fn fetch_etherscan_contract_name(
    chain: Chain,
    address: Address,
) -> color_eyre::Result<Option<String>> {
    let settings = ask(GetSettings).await?;
    let api_key = settings
        .etherscan_api_key
        .clone()
        .with_context(|| "Etherscan API key not set".to_string())?;
    let client = foundry_block_explorers::Client::new(chain, api_key)?;

    match client.contract_source_code(address).await {
        Ok(metadata) => Ok(Some(metadata.items[0].contract_name.clone())),
        Err(EtherscanError::ContractCodeNotVerified(_)) => Ok(None),
        Err(err) => Err(err.into()),
    }
}

pub async fn fetch_etherscan_abi(
    chain: Chain,
    address: Address,
) -> color_eyre::Result<Option<JsonAbi>> {
    let settings = ask(GetSettings).await?;
    let api_key = settings
        .etherscan_api_key
        .clone()
        .with_context(|| "Etherscan API key not set".to_string())?;
    let client = foundry_block_explorers::Client::new(chain, api_key)?;

    match client.contract_abi(address).await {
        Ok(abi) => Ok(Some(abi)),
        Err(EtherscanError::ContractCodeNotVerified(_)) => Ok(None),
        Err(err) => Err(err.into()),
    }
}
