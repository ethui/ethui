use alloy::{json_abi::JsonAbi, primitives::Address};
use alloy_chains::Chain;
use ethui_settings::actor::{get_actor, GetSettings};
use foundry_block_explorers::errors::EtherscanError;

pub async fn fetch_etherscan_contract_name(
    chain: Chain,
    address: Address,
) -> color_eyre::Result<Option<String>> {
    let actor = get_actor().await?;
    let settings = actor
        .ask(GetSettings)
        .await
        .map_err(|e| ethui_settings::Error::ActorSend(format!("{}", e)))?;
    let api_key = settings
        .etherscan_api_key
        .clone()
        .ok_or(ethui_settings::Error::EtherscanKeyNotSet)?;
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
    let actor = get_actor().await?;
    let settings = actor
        .ask(GetSettings)
        .await
        .map_err(|e| ethui_settings::Error::ActorSend(format!("{}", e)))?;
    let api_key = settings
        .etherscan_api_key
        .clone()
        .ok_or(ethui_settings::Error::EtherscanKeyNotSet)?;
    let client = foundry_block_explorers::Client::new(chain, api_key)?;

    match client.contract_abi(address).await {
        Ok(abi) => Ok(Some(abi)),
        Err(EtherscanError::ContractCodeNotVerified(_)) => Ok(None),
        Err(err) => Err(err.into()),
    }
}
