use ethers::providers::Middleware as _;
use ethui_networks::Networks;
use ethui_types::{GlobalState, ToEthers as _, UINotify};
use tracing::trace;

use crate::{init::FORGE, Error, Result};

pub(crate) async fn update_db_contracts() -> Result<()> {
    let db = ethui_db::get();

    let contracts = db.get_incomplete_contracts().await?;
    let mut any_updates = false;

    for (chain_id, address) in contracts.into_iter() {
        let code = {
            let networks = Networks::read().await;
            let network = networks
                .get_network(chain_id)
                .ok_or(Error::InvalidChainId)?;
            let provider = network.get_provider();
            provider.get_code(address.to_ethers(), None).await?
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
                )
                .await?
            }
        };
    }

    if any_updates {
        dbg!("any updates");
        ethui_broadcast::ui_notify(UINotify::ContractsUpdated).await;
    }

    Ok(())
}
