use alloy::providers::Provider as _;
use ethui_networks::NetworksActorExt as _;
use ethui_types::prelude::*;

/// Get the current network from the networks actor
pub(crate) async fn get_current_network() -> Network {
    ethui_networks::networks()
        .get_current()
        .await
        .expect("networks actor not available")
}

pub(crate) async fn get_code(address: Address, chain_id: u64) -> color_eyre::Result<Option<Bytes>> {
    let provider = ethui_networks::get_provider(chain_id).await?;
    let code = provider.get_code_at(address).await?;

    if code.is_empty() {
        Ok(None)
    } else {
        Ok(Some(code))
    }
}
