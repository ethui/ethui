use alloy::{primitives::Bytes, providers::Provider as _};
use ethui_networks::Networks;
use ethui_types::{Address, GlobalState, UINotify};
use tracing::{debug, error, trace};

use crate::{init::FORGE, Error, Result};

pub(crate) async fn update_db_contracts() -> Result<()> {
    let db = ethui_db::get();

    let contracts = db.get_incomplete_contracts().await?;
    let mut any_updates = false;

    for (chain_id, address, code) in contracts.into_iter() {
        let code: Option<Bytes> = match code {
            Some(code) if code.len() > 0 => Some(code),
            _ => get_code(chain_id, address).await.ok(),
        };

        let code = match code {
            Some(code) => code,
            None => continue,
        };

        let forge = FORGE.read().await;

        match forge.get_abi_for(&code) {
            None => continue,
            Some(abi) => {
                any_updates = true;
                trace!(
                    "updating contract {chain_id} {address} with ABI: {}",
                    abi.name
                );
                db.insert_contract_with_abi(
                    chain_id,
                    address,
                    Some(&code),
                    Some(serde_json::to_string(&abi.abi)?),
                    Some(abi.name),
                    None,
                )
                .await?
            }
        };
    }

    if any_updates {
        ethui_broadcast::ui_notify(UINotify::ContractsUpdated).await;
    }

    Ok(())
}

async fn get_code(chain_id: u32, address: Address) -> Result<Bytes> {
    debug!(
        "no code in db. fetching from provider for address 0x{:x}",
        address
    );
    let networks = Networks::read().await;
    // instead of failing we should just skip
    let network = match networks.get_network(chain_id) {
        Some(network) => network,
        None => {
            error!("failed to get network. ignoring");
            return Err(Error::InvalidChainId);
        }
    };

    let provider = network.get_alloy_provider().await?;
    provider
        .get_code_at(address)
        .await
        .map_err(|_| Error::InvalidChainId)
}
