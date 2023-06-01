pub mod commands;
mod error;
mod global;

pub use self::error::{Error, Result};
use crate::{
    app::{self, Notify},
    db::DB,
    settings::Settings,
    types::{ChecksummedAddress, GlobalState},
};
use ethers_core::types::{Address, U256};
use once_cell::sync::Lazy;
use serde::Deserialize;
use serde_json::json;

use tokio::sync::mpsc;
use url::Url;

use std::collections::HashMap;

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
    window_snd: mpsc::UnboundedSender<app::Event>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AlchemyResponse {
    pub address: Address,
    pub token_balances: Vec<TokenBalance>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TokenBalance {
    pub contract_address: Address,
    pub token_balance: U256,
}

impl Alchemy {
    pub fn new(db: DB, window_snd: mpsc::UnboundedSender<app::Event>) -> Self {
        Self { db, window_snd }
    }

    async fn fetch_balances(&self, chain_id: u32, address: ChecksummedAddress) -> Result<()> {
        let settings = Settings::read().await;
        if let (Some(api_key), Some(endpoint)) = (
            settings.inner.alchemy_api_key.as_ref(),
            ENDPOINTS.get(&chain_id),
        ) {
            let endpoint = endpoint.join(api_key)?;
            let client = reqwest::Client::new();
            let res: serde_json::Value = client
                .post(endpoint)
                .json(&json!({
                    "jsonrpc": "2.0",
                    "method": "alchemy_getTokenBalances",
                    "params": [address, "erc20"]
                }))
                .send()
                .await?
                .json()
                .await?;

            let res = (res["result"]).clone();
            let res: AlchemyResponse = serde_json::from_value(res)?;
            self.db.save_balances(res, chain_id).await?;
            self.window_snd.send(Notify::TxsUpdated.into())?;
        }

        Ok(())
    }
}
