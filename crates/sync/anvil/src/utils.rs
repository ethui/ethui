use ethers::providers::{Http, Middleware, Provider};
use ethui_types::{Address, ToAlloy, ToEthers, U256};

use crate::Result;

pub async fn get_native_balance(url: String, address: Address) -> Result<U256> {
    let provider: Provider<Http> = Provider::<Http>::try_from(&url.to_string()).unwrap();

    Ok(provider
        .get_balance(address.to_ethers(), None)
        .await?
        .to_alloy())
}
