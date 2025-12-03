use alloy::providers::Provider as _;
use common::prelude::*;

pub async fn get_code(address: Address, chain_id: u32) -> color_eyre::Result<Option<Bytes>> {
    let provider = networks::get_provider(chain_id).await?;
    let code = provider.get_code_at(address).await?;

    if code.is_empty() {
        Ok(None)
    } else {
        Ok(Some(code))
    }
}
