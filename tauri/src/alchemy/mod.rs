pub mod commands;
mod error;
mod global;

pub use self::error::{Error, Result};
use crate::{
    abis,
    db::DB,
    networks::Networks,
    settings::Settings,
    types::{ChecksummedAddress, GlobalState},
};
use abis::erc20_token::ERC20Token;
use ethers::types::Address;
use ethers_core::types::U256;
use futures::{stream, StreamExt};
use once_cell::sync::Lazy;
use serde::Deserialize;
use serde_json::json;

use url::Url;

use std::{collections::HashMap, sync::Arc};

static ENDPOINTS: Lazy<HashMap<u32, Url>> = Lazy::new(|| {
    HashMap::from([
        (
            1,
            Url::parse("https://eth-mainnet.g.alchemy.com/v2/").unwrap(),
        ),
        (
            5,
            Url::parse("https://eth-goerli.g.alchemy.com/v2/").unwrap(),
        ),
    ])
});

#[derive(Debug)]
pub struct Alchemy {
    db: DB,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AlchemyErc20BalancesResponse {
    pub address: Address,
    pub token_balances: Vec<TokenBalance>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TokenBalance {
    pub contract_address: Address,
    pub token_balance: U256,
}

#[derive(Debug)]
pub struct TokenMetadata {
    pub contract_address: Address,
    pub symbol: String,
    pub decimals: u8,
    pub token_balance: U256,
}

impl Alchemy {
    pub fn new(db: DB) -> Self {
        Self { db }
    }

    async fn fetch_balances(&self, chain_id: u32, address: ChecksummedAddress) -> Result<()> {
        let networks = Networks::read().await;
        let settings = Settings::read().await;
        if let (Some(api_key), Some(endpoint)) = (
            settings.inner.alchemy_api_key.as_ref(),
            ENDPOINTS.get(&chain_id),
        ) {
            let endpoint = endpoint.join(api_key)?;
            let client = reqwest::Client::new();

            let urls = vec![
                json!({
                    "jsonrpc": "2.0",
                    "method": "eth_getBalance",
                    "params": [address, "latest"]
                }),
                json!({
                    "jsonrpc": "2.0",
                    "method": "alchemy_getTokenBalances",
                    "params": [address, "erc20"]
                }),
            ];

            let mut bodies = stream::iter(urls)
                .map(|url| {
                    let client = client.clone();
                    let endpoint = endpoint.clone();
                    tokio::spawn(async move {
                        let resp = client.post(endpoint).json(&url).send().await.unwrap();
                        resp.json::<serde_json::Value>().await
                    })
                })
                .buffer_unordered(2);

            let native_balance = bodies.next().await.unwrap()??;
            let native_balance = (native_balance["result"]).clone();
            let native_balance: U256 = serde_json::from_value(native_balance)?;

            let erc20_balances = bodies.next().await.unwrap()??;
            let erc20_balances = (erc20_balances["result"]).clone();
            let erc20_balances: AlchemyErc20BalancesResponse =
                serde_json::from_value(erc20_balances)?;

            let provider = networks.get_current_provider();
            let client = Arc::new(provider);

            let balances_amount = erc20_balances.token_balances.len();
            let erc20_stream = stream::iter(erc20_balances.token_balances)
                .map(|balance| {
                    let contract = ERC20Token::new(balance.contract_address, client.clone());
                    tokio::spawn(async move {
                        TokenMetadata {
                            contract_address: balance.contract_address,
                            token_balance: balance.token_balance,
                            symbol: contract.symbol().call().await.unwrap(),
                            decimals: contract.decimals().call().await.unwrap(),
                        }
                    })
                })
                .buffer_unordered(balances_amount);

            let balances = erc20_stream
                .fold(Vec::<TokenMetadata>::new(), |mut balances, f| async move {
                    balances.push(f.unwrap());
                    balances
                })
                .await;
            self.db
                .save_balances(balances, chain_id, erc20_balances.address)
                .await?;

            let network = networks.get_current_network();
            let currency = network.currency.clone();

            self.db
                .save_native_balance(
                    native_balance,
                    erc20_balances.address,
                    chain_id,
                    network.decimals,
                    currency,
                )
                .await?;
        }

        Ok(())
    }
}
