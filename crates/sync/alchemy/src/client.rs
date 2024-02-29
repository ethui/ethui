use std::time::Duration;

use ethers::providers::{
    Http, HttpRateLimitRetryPolicy, Middleware, Provider, RetryClient, RetryClientBuilder,
};
use iron_types::{alchemy::AlchemyAssetTransfer, Address, ToAlloy, U64};
use iron_types::{ToEthers, U256};
use serde::{Deserialize, Serialize};
use serde_json::json;

use crate::{networks, Result};

#[derive(Debug)]
pub(crate) struct Client(Provider<RetryClient<Http>>);

pub(crate) enum Direction {
    From(Address),
    To(Address),
}

impl Client {
    pub fn new(chain_id: u32, api_key: &str) -> Result<Self> {
        let endpoint = networks::get_endpoint(chain_id, api_key)?;
        let http = Http::new(endpoint);

        let policy = Box::<HttpRateLimitRetryPolicy>::default();

        let res = RetryClientBuilder::default()
            .rate_limit_retries(10)
            .timeout_retries(3)
            .initial_backoff(Duration::from_millis(500))
            .compute_units_per_second(300)
            .build(http, policy);

        Ok(Self(Provider::new(res)))
    }

    pub async fn get_block_number(&self) -> Result<U64> {
        let block = self.0.get_block_number().await?;
        Ok(block.to_alloy())
    }

    pub async fn get_asset_transfers(
        &self,
        addr: Direction,
        from_block: U64,
        latest: U64,
    ) -> Result<Vec<AlchemyAssetTransfer>> {
        let mut params = json!([{
            "fromBlock": format!("0x{:x}", from_block),
            "toBlock": format!("0x{:x}",latest),
            "maxCount": "0x32",
            "category": ["external", "internal", "erc20", "erc721", "erc1155"],
        }]);

        match addr {
            Direction::From(addr) => params["fromAddress"] = json!(addr),
            Direction::To(addr) => params["toAddress"] = json!(addr),
        }

        #[derive(Debug, Serialize, Deserialize)]
        #[serde(rename_all = "camelCase")]
        pub(super) struct AssetTransfers {
            transfers: Vec<AlchemyAssetTransfer>,
        }

        let req: AssetTransfers = self.0.request("alchemy_getAssetTransfers", &params).await?;

        Ok(req.transfers)
    }

    pub async fn get_native_balance(&self, address: Address) -> Result<U256> {
        Ok(self
            .0
            .get_balance(address.to_ethers(), None)
            .await
            .map(|x| x.to_alloy())?)
    }

    pub async fn get_erc20_balances(&self, address: Address) -> Result<Vec<(Address, U256)>> {
        #[derive(Debug, Serialize, Deserialize)]
        #[serde(rename_all = "camelCase")]
        struct Balances {
            pub address: Address,
            pub token_balances: Vec<TokenBalance>,
        }

        #[derive(Debug, Serialize, Deserialize)]
        #[serde(rename_all = "camelCase")]
        struct TokenBalance {
            pub contract_address: Address,
            pub token_balance: U256,
        }

        impl From<TokenBalance> for (Address, U256) {
            fn from(value: TokenBalance) -> Self {
                (value.contract_address, value.token_balance)
            }
        }

        let params = json!([format!("0x{:x}", address), "erc20"]);
        let res: Balances = self.0.request("alchemy_getTokenBalances", params).await?;

        Ok(res.token_balances.into_iter().map(Into::into).collect())
    }
}
