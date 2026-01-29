use alloy::{
    network::Ethereum,
    providers::{Provider as _, ProviderBuilder},
};
use ethui_abis::IERC20;
use ethui_types::{Address, TokenMetadata, U256};

pub async fn get_native_balance(url: String, address: Address) -> color_eyre::Result<U256> {
    let provider = ProviderBuilder::new().connect(&url).await?;

    Ok(provider.get_balance(address).await?)
}

pub async fn fetch_erc20_metadata(
    address: Address,
    client: &alloy::providers::RootProvider<Ethereum>,
) -> TokenMetadata {
    let contract = IERC20::new(address, client);

    TokenMetadata {
        address,
        name: contract.name().call().await.ok(),
        symbol: contract.symbol().call().await.ok(),
        decimals: contract.decimals().call().await.ok(),
    }
}
