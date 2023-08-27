use ethers::{
    abi::Abi,
    etherscan::contract::Metadata,
    prelude::{errors::EtherscanError, Client},
    types::{Address, Chain},
};
use iron_settings::Settings;
use iron_types::GlobalState;

use crate::Result;

pub(crate) async fn fetch_etherscan_contract_name(
    chain: Chain,
    address: Address,
) -> Result<Option<String>> {
    let settings = Settings::read().await;
    let api_key = settings.inner.etherscan_api_key;

    let client = Client::new(chain, api_key)?;

    match client.contract_source_code(address).await {
        Ok(metadata) => Ok(Some(metadata.items[0].contract_name)),
        Err(EtherscanError::ContractCodeNotVerified) => Ok(None),
        err => err?,
    }
}

pub(crate) async fn fetch_etherscan_abi(chain: Chain, address: Address) -> Result<Option<Abi>> {
    let settings = Settings::read().await;
    let api_key = settings.inner.etherscan_api_key;

    let client = Client::new(chain, api_key)?;

    match client.contract_abi(address).await {
        Ok(abi) => Ok(Some(abi)),
        Err(EtherscanError::ContractCodeNotVerified) => Ok(None),
        err => err?,
    }
}
