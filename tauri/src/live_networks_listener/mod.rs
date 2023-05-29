mod error;

use crate::db::DB;
use crate::{
    types::GlobalState,
    wallets::{WalletControl, Wallets},
};
pub use error::{Error, Result};
use ethers_core::types::{Address, U256};
use serde::Deserialize;
use serde_json::json;
use url::Url;

#[derive(Debug)]
pub struct LiveNetworksListener {
    chain_id: u32,
    db: DB,
    alchemy_url: Url,
}

impl LiveNetworksListener {
    pub fn new(chain_id: u32, db: DB, alchemy_url: Url) -> Self {
        Self {
            chain_id,
            db,
            alchemy_url,
        }
    }

    pub fn run(&mut self) -> Result<()> {
        let alchemy_url = self.alchemy_url.clone();
        let db = self.db.clone();
        let chain_id = self.chain_id;
        tokio::spawn(async move { process(alchemy_url, db, chain_id).await });
        Ok(())
    }

    pub fn stop(&mut self) {}
}

async fn process(ws_url: Url, db: DB, chain_id: u32) -> Result<()> {
    let address = Wallets::read()
        .await
        .get_current_wallet()
        .get_current_address()
        .await;
    let address = json!(address); // didnt find a better way to convert it to &str

    if let Some(address) = address.as_str() {
        let client = reqwest::Client::new();
        let res: serde_json::Value = client
            .post(ws_url)
            .json(&json!({
                "jsonrpc": "2.0",
                "method": "alchemy_getTokenBalances",
                "params": [address, "erc20"]
            }))
            .send()
            .await?
            .json()
            .await?;

        let res = (&res["result"]).clone();
        let res: AlchemyResponse = serde_json::from_value(res).unwrap();
        db.save_balances(res, chain_id).await?;
    }
    Ok(())
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
