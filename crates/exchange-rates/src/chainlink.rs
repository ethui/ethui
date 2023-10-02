use std::sync::Arc;
use ethers::{
    providers::{Http, Provider},
    types::Address,
};
use iron_abis::AggregatorV3Interface;

pub async fn get_feed_price<'a>(address: &Address, rpcs: &'a Vec<String>) -> Option<i128> {
    for rpc in rpcs {
        if let Ok(provider) = Provider::<Http>::try_from(rpc) {
            let client = Arc::new(provider);
            let contract = AggregatorV3Interface::new(*address, client);
            if let Ok(round_data) = contract.latest_round_data().call().await {
                let res = round_data.1.as_i128();
                return Some(res)
            }
        }
    }
    None
}
