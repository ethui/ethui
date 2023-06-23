pub mod commands;
mod error;
mod global;
mod types;

use std::collections::HashMap;

use ethers::providers::{Http, Middleware, Provider};
use ethers_core::types::Address;
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
        let client = self.client(chain_id).await?;

        let res: Balances = client
            .request("alchemy_getTokenBalances", [&address.to_string(), "erc20"])
            .await?;
        let balances = res.token_balances.into_iter().map(Into::into).collect();

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
        let tip = dbg!(self.db.get_tip(chain_id, address).await)?;
        let client = self.client(chain_id).await?;

        let latest = client.get_block_number().await?;
        let txs: Json = dbg!(
            client
                .request(
                    "alchemy_getAssetTransfers",
                    dbg!(json!([{
                        "fromBlock": format!("0x{:x}", tip + 1),
                        "toBlock": format!("0x{:x}",latest),
                        "fromAddress": address,
                        "category": ["external"]
                    }])),
                )
                .await
        )?;

        dbg!(&txs);

        Ok(())
    }

    async fn client(&self, chain_id: u32) -> Result<Provider<Http>> {
        let endpoint = self.endpoint(chain_id).await?;

        Ok(Provider::<Http>::try_from(endpoint.as_str())?)
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
