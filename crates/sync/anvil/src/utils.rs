use alloy::providers::{Provider as _, ProviderBuilder};
use ethui_types::{Address, U256};

pub async fn get_native_balance(url: String, address: Address) -> color_eyre::Result<U256> {
    let provider = ProviderBuilder::new().connect(&url).await?;

    Ok(provider.get_balance(address).await?)
}
