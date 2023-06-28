pub mod commands;
mod error;
mod global;
mod types;
mod utils;

use std::{collections::HashMap, time::Duration};

use ethers::providers::{
    Http, HttpRateLimitRetryPolicy, Middleware, Provider, RetryClient, RetryClientBuilder,
};
use ethers_core::types::{Address, U256};
use futures::{future, stream, StreamExt};
use once_cell::sync::Lazy;
use serde_json::json;
use tokio::sync::mpsc;
use types::{Balances, Transfers};
use url::Url;

pub use self::error::{Error, Result};
use crate::{
    app::{self, Notify},
    db::DB,
    settings::Settings,
    types::{ChecksummedAddress, GlobalState},
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
    async fn fetch_erc20_balances(&self, chain_id: u32, address: ChecksummedAddress) -> Result<()> {
        let client = self.client(chain_id).await?;

        let res: Balances = client
            .request("alchemy_getTokenBalances", [&address.to_string(), "erc20"])
            .await?;
        let balances: Vec<(Address, U256)> =
            res.token_balances.into_iter().map(Into::into).collect();

        utils::fetch_erc20_metadata(balances.clone(), client, chain_id, &self.db).await?;

        self.db
            .save_erc20_balances(chain_id, res.address, balances)
            .await?;
        self.window_snd.send(Notify::BalancesUpdated.into())?;

        Ok(())
    }

    async fn fetch_native_balance(&self, chain_id: u32, address: Address) -> Result<()> {
        let client = self.client(chain_id).await?;
        let balance = client.get_balance(address, None).await.unwrap();

        self.db
            .save_native_balance(balance, chain_id, address)
            .await?;
        self.window_snd.send(Notify::BalancesUpdated.into())?;
        Ok(())
    }

    async fn fetch_transactions(&self, chain_id: u32, address: Address) -> Result<()> {
        let client = self.client(chain_id).await?;

        let tip = self.db.get_tip(chain_id, address).await?;
        let latest = client.get_block_number().await?;

        if tip.saturating_sub(1) == latest.as_u64() {
            return Ok(());
        }

        let outgoing: Transfers = (client
            .request(
                "alchemy_getAssetTransfers",
                json!([{
                    "fromBlock": format!("0x{:x}", tip + 1),
                    "toBlock": format!("0x{:x}",latest),
                    "fromAddress": address,
                    "category": ["external"],
                }]),
            )
            .await)?;

        let incoming: Transfers = (client
            .request(
                "alchemy_getAssetTransfers",
                json!([{
                    "fromBlock": format!("0x{:x}", tip + 1),
                    "toBlock": format!("0x{:x}",latest),
                    "toAddress": address,
                    "category": ["external"],
                }]),
            )
            .await)?;

        let mut chunks = stream::iter(outgoing.transfers.into_iter().chain(incoming.transfers))
            .map(|transfer| utils::transfer_into_tx(transfer, &client, chain_id, &self.db))
            .buffer_unordered(1)
            .chunks(20);

        while let Some(chunk) = chunks.next().await {
            let txs = chunk.into_iter().filter_map(|r| r.ok()).flatten().collect();

            self.db.save_events(chain_id, txs).await?;
            self.db.set_tip(chain_id, address, latest.as_u64()).await?;
            self.window_snd.send(Notify::TxsUpdated.into())?;
        }

        Ok(())
    }

    async fn client(&self, chain_id: u32) -> Result<Provider<RetryClient<Http>>> {
        let endpoint = self.endpoint(chain_id).await?;
        let http = Http::new(endpoint);

        let policy = Box::<HttpRateLimitRetryPolicy>::default();

        let res = RetryClientBuilder::default()
            .rate_limit_retries(10)
            .timeout_retries(3)
            .initial_backoff(Duration::from_millis(500))
            .compute_units_per_second(300)
            .build(http, policy);

        let provider = Provider::new(res);

        Ok(provider)
    }

    async fn endpoint(&self, chain_id: u32) -> Result<Url> {
        let settings = Settings::read().await;

        let endpoint = match ENDPOINTS.get(&chain_id) {
            Some(endpoint) => endpoint,
            None => return Err(Error::UnsupportedChainId(chain_id)),
        };

        let api_key = match settings.inner.alchemy_api_key.as_ref() {
            Some(api_key) => api_key,
            None => return Err(Error::NoAPIKey),
        };

        Ok(endpoint.join(api_key)?)
    }
}
