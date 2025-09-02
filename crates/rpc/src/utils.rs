use alloy::providers::Provider as _;
use ethui_types::prelude::*;

pub async fn get_code(address: Address, chain_id: u32) -> color_eyre::Result<Option<Bytes>> {
    use ethui_networks::Networks;
    
    let networks = Networks::read().await;
    let network = networks.get_network(chain_id)
        .ok_or_else(|| color_eyre::eyre::eyre!("Network with chain_id {} not found", chain_id))?;
    let provider = network.get_provider();
    
    let code = provider.get_code_at(address).await?;
    
    if code.is_empty() {
        Ok(None)
    } else {
        Ok(Some(code))
    }
}
