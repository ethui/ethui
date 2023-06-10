pub mod commands;
mod error;
mod global;
mod types;

use std::collections::HashMap;

use once_cell::sync::Lazy;
use serde_json::json;
use tokio::sync::mpsc;
use types::Balances;
use url::Url;

pub use self::error::{Error, Result};
use crate::{
    app::{self, Notify},
    db::DB,
    settings::Settings,
    types::{ChecksummedAddress, GlobalState, Json},
};

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

impl Alchemy {
    pub fn new(db: DB, window_snd: mpsc::UnboundedSender<app::Event>) -> Self {
        Self { db, window_snd }
    }

    /// fetches ERC20 balances for a user/chain_id
    /// updates the DB, and notifies the UI
    async fn fetch_balances(&self, chain_id: u32, address: ChecksummedAddress) -> Result<()> {
        let res: Balances = self
            .request(
                chain_id,
                json!({
                    "jsonrpc": "2.0",
                    "method": "alchemy_getTokenBalances",
                    "params": [address, "erc20"]
                }),
            )
            .await?;
        let balances = res.token_balances.into_iter().map(Into::into).collect();

        self.db
            .save_balances(chain_id, res.address, balances)
            .await?;
        self.window_snd.send(Notify::BalancesUpdated.into())?;

        Ok(())
    }

    async fn request<R>(&self, chain_id: u32, payload: Json) -> Result<R>
    where
        R: serde::de::DeserializeOwned,
    {
        let settings = Settings::read().await;

        let endpoint = match ENDPOINTS.get(&chain_id) {
            Some(endpoint) => endpoint,
            None => return Err(Error::UnsupportedChainId(chain_id)),
        };

        let api_key = match settings.inner.alchemy_api_key.as_ref() {
            Some(api_key) => api_key,
            None => return Err(Error::NoAPIKey),
        };

        let endpoint = endpoint.join(api_key)?;
        let client = reqwest::Client::new();
        let res: serde_json::Value = client
            .post(endpoint)
            .json(&payload)
            .send()
            .await?
            .json()
            .await?;

        Ok(serde_json::from_value(res["result"].clone())?)
    }
}
