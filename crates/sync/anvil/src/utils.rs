use alloy::providers::{Provider as _, ProviderBuilder};
use ethui_types::{Address, U256};

use crate::Result;

pub async fn get_native_balance(url: String, address: Address) -> Result<U256> {
    let provider = ProviderBuilder::new().connect(&url).await?;

    Ok(provider.get_balance(address).await?)
}
