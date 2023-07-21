use ethers::providers::Middleware;
use iron_networks::Networks;
use iron_types::{ChecksummedAddress, GlobalState};

use super::{abi::Abi, FORGE};

/// Gets the ABI, if known, for a given address and chain_id
#[tauri::command]
pub async fn foundry_get_abi(
    address: ChecksummedAddress,
    chain_id: u32,
) -> Result<Option<Abi>, String> {
    let code = {
        let networks = Networks::read().await;
        let network = networks.get_network(chain_id).ok_or("invalid chain_id")?;
        let provider = network.get_provider();
        provider
            .get_code(address.0, None)
            .await
            .map_err(|_| "could not get code")?
    };

    if code.len() == 0 {
        return Ok(None);
    }

    let foundry = FORGE.read().await;
    Ok(foundry.get_abi_for(code))
}
