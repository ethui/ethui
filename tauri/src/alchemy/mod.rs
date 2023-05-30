mod error;

pub use self::error::{Error, Result};
use crate::{
    db::DB,
    networks::Networks,
    settings::Settings,
    types::GlobalState,
    wallets::{WalletControl, Wallets},
};
use ethers_core::types::{Address, U256};
use once_cell::sync::Lazy;
use once_cell::sync::OnceCell;
use serde::{Deserialize, Serialize};
use serde_json::json;
use tokio::{spawn, sync::RwLock};
use url::Url;

use std::collections::HashMap;

static ENDPOINTS: Lazy<HashMap<u32, Url>> = Lazy::new(|| {
    println!("initializing");
    let mut endpoints: HashMap<u32, Url> = HashMap::new();
    endpoints.insert(
        1,
        Url::parse("https://eth-mainnet.g.alchemy.com/v2/").unwrap(),
    );
    endpoints.insert(
        5,
        Url::parse("https://eth-goerli.g.alchemy.com/v2/").unwrap(),
    );
    endpoints
});

#[derive(Debug, Clone, Serialize)]
pub struct Alchemy {
    #[serde(skip)]
    db: DB,
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

static ALCHEMY: OnceCell<RwLock<Alchemy>> = OnceCell::new();

impl Alchemy {
    pub async fn init(db: DB) {
        ALCHEMY.set(RwLock::new(Self { db })).unwrap();

        // TODO: init a timer?
        // make the first request?
        spawn(async { Self::fetch_balances().await.unwrap() });
    }

    async fn fetch_balances() -> Result<()> {
        let networks = Networks::read().await;
        let chain_id = networks.get_current_network().chain_id;
        let wallets = Wallets::read().await;
        let address = wallets.get_current_wallet().get_current_address().await.0;
        let settings = Settings::read().await;
        let api_key = settings.inner.alchemy_api_key.as_ref().unwrap();
        let url = ENDPOINTS.get(&chain_id).unwrap();
        let url = url.join(&api_key)?;
        let client = reqwest::Client::new();
        let res: serde_json::Value = client
            .post(url)
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
        let res: AlchemyResponse = serde_json::from_value(dbg!(res)).unwrap();
        ALCHEMY
            .get()
            .unwrap()
            .read()
            .await
            .db
            .save_balances(res, chain_id)
            .await?;

        Ok(())
    }
}
