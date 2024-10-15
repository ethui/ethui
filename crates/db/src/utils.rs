use alloy::{json_abi::JsonAbi, primitives::Address};
use alloy_chains::Chain;
use ethui_settings::Settings;
use ethui_types::GlobalState;
use foundry_block_explorers::errors::EtherscanError;

use crate::Result;

pub async fn fetch_etherscan_contract_name(
    chain: Chain,
    address: Address,
) -> Result<Option<String>> {
    let api_key = Settings::read().await.get_etherscan_api_key()?;
    let client = foundry_block_explorers::Client::new(chain, api_key)?;

    match client.contract_source_code(address).await {
        Ok(metadata) => Ok(Some(metadata.items[0].contract_name.clone())),
        Err(EtherscanError::ContractCodeNotVerified(_)) => Ok(None),
        Err(err) => Err(err.into()),
    }
}

pub async fn fetch_etherscan_abi(chain: Chain, address: Address) -> Result<Option<JsonAbi>> {
    let api_key = Settings::read().await.get_etherscan_api_key()?;
    let client = foundry_block_explorers::Client::new(chain, api_key)?;

    match client.contract_abi(address).await {
        Ok(abi) => Ok(Some(abi)),
        Err(EtherscanError::ContractCodeNotVerified(_)) => Ok(None),
        Err(err) => Err(err.into()),
    }
}
