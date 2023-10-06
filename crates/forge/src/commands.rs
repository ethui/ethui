use ethers::abi::Abi;
use ethers::providers::Middleware;
use iron_networks::Networks;
use iron_types::{Address, GlobalState};

use super::{Error, Result, FORGE};

/// Gets the ABI, if known, for a given address and chain_id
#[tauri::command]
pub async fn forge_get_abi(address: Address, chain_id: u32) -> Result<Option<Abi>> {
    let code = {
        let networks = Networks::read().await;
        let network = networks
            .get_network(chain_id)
            .ok_or(Error::InvalidChainId)?;
        let provider = network.get_provider();
        provider.get_code(address, None).await?
    };

    if code.len() == 0 {
        return Ok(None);
    }

    let forge = FORGE.read().await;

    match forge.get_abi_for(code) {
        None => Ok(None),
        Some(abi) => Ok(Some(serde_json::from_value(abi.abi)?)),
    }
}

#[tauri::command]
pub async fn forge_get_name(address: Address, chain_id: u32) -> Result<Option<String>> {
    let code = {
        let networks = Networks::read().await;
        let network = networks
            .get_network(chain_id)
            .ok_or(Error::InvalidChainId)?;
        let provider = network.get_provider();
        provider.get_code(address, None).await?
    };

    if code.len() == 0 {
        return Ok(None);
    }

    let forge = FORGE.read().await;

    match forge.get_abi_for(code) {
        None => Ok(None),
        Some(abi) => Ok(Some(abi.name)),
    }
}
