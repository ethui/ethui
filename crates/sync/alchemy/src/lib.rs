mod error;
mod init;
mod types;
mod utils;
use std::{collections::HashMap, time::Duration};

use ethers::{
    core::types::{Address, U256},
    providers::{
        Http, HttpRateLimitRetryPolicy, Middleware, Provider, RetryClient, RetryClientBuilder,
    },
};
use futures::{stream, StreamExt};
pub use init::init;
use iron_db::DB;
use iron_settings::Settings;
use iron_types::{Event, GlobalState, SyncUpdates};
use once_cell::sync::Lazy;
use serde_json::json;
use tracing::{instrument, trace};
use types::{Balances, Transfers};
use url::Url;

pub use self::error::{Error, Result};

struct Network {
    base_url: Url,
    default_from_block: u64,
}
static NETWORKS: Lazy<HashMap<u32, Network>> = Lazy::new(|| {
    let mut map: HashMap<u32, Network> = Default::default();

    map.insert(
        1,
        Network {
            base_url: Url::parse("https://eth-mainnet.g.alchemy.com/v2/").unwrap(),
            default_from_block: 15537393, // September 15 2022 - The Merge
        },
    );

    map.insert(
        5,
        Network {
            base_url: Url::parse("https://eth-goerli.g.alchemy.com/v2/").unwrap(),
            default_from_block: 7245414, // July 18th 2022
        },
    );

    map.insert(
        11155111,
        Network {
            base_url: Url::parse("https://eth-sepolia.g.alchemy.com/v2/").unwrap(),
            default_from_block: 3000000, // May 1st 2023
        },
    );

    map
});

pub fn supports_network(chain_id: u32) -> bool {
    NETWORKS.get(&chain_id).is_some()
}

#[derive(Debug)]
pub struct Alchemy {
    db: DB,
}

impl Alchemy {
    pub fn new(db: DB) -> Self {
        Self { db }
    }

    #[instrument(skip(self))]
    pub async fn fetch_updates(
        &self,
        chain_id: u32,
        addr: Address,
        from_block: Option<u64>,
    ) -> Result<SyncUpdates> {
        let (events, tip) = self.fetch_transactions(chain_id, addr, from_block).await?;
        let balances = self.fetch_erc20_balances(chain_id, addr).await?;
        let native_balance = self.fetch_native_balance(chain_id, addr).await?;

        Ok(SyncUpdates {
            events: Some(events),
            erc20_balances: Some(balances),
            native_balance: Some(native_balance),
            tip,
        })
    }

    /// fetches ERC20 balances for a user/chain_id
    /// updates the DB, and notifies the UI
    async fn fetch_erc20_balances(
        &self,
        chain_id: u32,
        address: Address,
    ) -> Result<Vec<(Address, U256)>> {
        let client = self.client(chain_id).await?;

        let res: Balances = client
            .request(
                "alchemy_getTokenBalances",
                [&format!("0x{:x}", address), "erc20"],
            )
            .await?;
        let balances: Vec<(Address, U256)> =
            res.token_balances.into_iter().map(Into::into).collect();

        // TODO: this should be done by a separate worker on iron_sync
        utils::fetch_erc20_metadata(balances.clone(), client, chain_id, &self.db).await?;

        Ok(balances)
    }

    async fn fetch_native_balance(&self, chain_id: u32, address: Address) -> Result<U256> {
        let client = self.client(chain_id).await?;

        Ok(client.get_balance(address, None).await?)
    }

    async fn fetch_transactions(
        &self,
        chain_id: u32,
        addr: Address,
        from_block: Option<u64>,
    ) -> Result<(Vec<Event>, Option<u64>)> {
        trace!("fetching");
        let client = self.client(chain_id).await?;

        let from_block = from_block.unwrap_or_else(|| default_from_block(chain_id));
        let latest = client.get_block_number().await?;

        // if tip - 1 == latest, we're up to date, nothing to do
        if from_block.saturating_sub(1) == latest.as_u64() {
            return Ok(Default::default());
        }

        let params = json!([{
            "fromBlock": format!("0x{:x}", from_block),
            "toBlock": format!("0x{:x}",latest),
            "maxCount": "0x32",
            "fromAddress": format!("0x{:x}", addr),
            "category": ["external", "internal", "erc20", "erc721", "erc1155"],
        }]);

        let outgoing: Transfers = (client
            .request("alchemy_getAssetTransfers", params.clone())
            .await)?;
        let incoming: Transfers = (client.request("alchemy_getAssetTransfers", params).await)?;

        trace!(
            event = "fetched",
            count = outgoing.transfers.len() + incoming.transfers.len()
        );

        // maps over each request, parsing events out of each and flattening everything into a
        // final result
        let events: Vec<Event> =
            stream::iter(outgoing.transfers.into_iter().chain(incoming.transfers))
                .then(|transfer| async { utils::transfer_into_tx(transfer, &client).await })
                .collect::<Vec<Result<Vec<_>>>>()
                .await
                .into_iter()
                .collect::<Result<Vec<Vec<Event>>>>()
                .map(|v| v.into_iter().flatten().collect())?;

        trace!(event = "fetched events", count = events.len());

        if events.is_empty() {
            return Ok(Default::default());
        }

        let tip = events.iter().map(|tx| tx.block_number()).max();

        Ok((events, tip))
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
        let endpoint = match NETWORKS.get(&chain_id) {
            Some(network) => network.base_url.clone(),
            None => return Err(Error::UnsupportedChainId(chain_id)),
        };

        let settings = Settings::read().await;
        let api_key = match settings.inner.alchemy_api_key.as_ref() {
            Some(api_key) => api_key,
            None => return Err(Error::NoAPIKey),
        };

        Ok(endpoint.join(api_key)?)
    }
}

fn default_from_block(chain_id: u32) -> u64 {
    NETWORKS
        .get(&chain_id)
        .map(|network| network.default_from_block)
        .unwrap_or(0)
}
