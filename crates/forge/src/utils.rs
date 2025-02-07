use alloy::providers::Provider as _;
use ethui_networks::Networks;
use ethui_types::{GlobalState, UINotify};
use tracing::{error, trace};

use crate::{init::FORGE, Result};

pub(crate) async fn update_db_contracts() -> Result<()> {
    let db = ethui_db::get();

    let contracts = db.get_incomplete_contracts().await?;
    let mut any_updates = false;

    for (chain_id, address) in contracts.into_iter() {
        let code = {
            let networks = Networks::read().await;
            // instead of failing we should just skip
            let network = match networks.get_network(chain_id) {
                Some(network) => network,
                None => {
                    error!("failed to get network. ignoring");
                    continue;
                }
            };

            let provider = network.get_alloy_provider().await?;
            match provider.get_code_at(address).await {
                Ok(code) => code,
                Err(_e) => {
                    error!("failed to get code. ignoring");
                    continue;
                }
            }
        };

        if code.len() == 0 {
            continue;
        }

        let forge = FORGE.read().await;

        match forge.get_abi_for(code) {
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
