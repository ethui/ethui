use alloy::providers::Provider as _;
use ethui_types::prelude::*;

pub async fn get_code(address: Address, chain_id: u32) -> jsonrpc_core::Result<Option<String>> {
    use serde_json::json;
    use ethui_networks::Networks;
    
    let networks = Networks::read().await;
    let network = networks.get_network(chain_id)
        .ok_or_else(|| jsonrpc_core::Error::invalid_params(format!("Network with chain_id {} not found", chain_id)))?;
    let provider = network.get_provider();
    
    let params = jsonrpc_core::Params::Array(vec![
        json!(address),
        json!("latest"),
    ]);
    
    let result = provider
        .raw_request::<_, String>("eth_getCode".into(), params)
        .await
        .map_err(crate::error::alloy_to_jsonrpc_error)?;
        
    if result == "0x" || result.is_empty() {
        Ok(None)
    } else {
        Ok(Some(result))
    }
}
