use alloy::{
    providers::{ext::AnvilApi, ProviderBuilder, RootProvider},
    rpc::client::ClientBuilder,
    transports::{
        http::{Client, Http},
        layers::{RetryBackoffLayer, RetryBackoffService},
        BoxTransport,
    },
};
use serde::{Deserialize, Serialize};
use url::Url;

use super::Result;

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Network {
    pub name: String,
    pub chain_id: u32,
    pub explorer_url: Option<String>,
    pub http_url: String,
    pub ws_url: Option<String>,
    pub currency: String,
    pub decimals: u32,

    /// Ability to forcefully tell ethui that a given chain is anvil, even if chain ID is not the
    /// expected 31337
    #[serde(default = "default_force_is_anvil")]
    pub force_is_anvil: bool,
}

impl Network {
    pub fn mainnet() -> Self {
        Self {
            name: String::from("Mainnet"),
            chain_id: 1,
            explorer_url: Some(String::from("https://etherscan.io/search?q=")),
            http_url: String::from("https://eth.llamarpc.com"),
            ws_url: None,
            currency: String::from("ETH"),
            decimals: 18,
            force_is_anvil: false,
        }
    }

    pub fn goerli() -> Self {
        Self {
            name: String::from("Goerli"),
            chain_id: 5,
            explorer_url: Some(String::from("https://goerli.etherscan.io/search?q=")),
            http_url: String::from("https://rpc.ankr.com/eth_goerli"),
            ws_url: None,
            currency: String::from("ETH"),
            decimals: 18,
            force_is_anvil: false,
        }
    }

    pub fn sepolia() -> Self {
        Self {
            name: String::from("Sepolia"),
            chain_id: 11155111,
            explorer_url: Some(String::from("https://sepolia.etherscan.io/search?q=")),
            http_url: String::from("https://rpc2.sepolia.org"),
            ws_url: None,
            currency: String::from("ETH"),
            decimals: 18,
            force_is_anvil: false,
        }
    }

    pub fn anvil() -> Self {
        Self {
            name: String::from("Anvil"),
            chain_id: 31337,
            explorer_url: None,
            http_url: String::from("http://localhost:8545"),
            ws_url: Some(String::from("ws://localhost:8545")),
            currency: String::from("ETH"),
            decimals: 18,
            force_is_anvil: true,
        }
    }

    pub fn all_default() -> Vec<Self> {
        vec![
            Self::anvil(),
            Self::mainnet(),
            Self::goerli(),
            Self::sepolia(),
        ]
    }

    pub fn chain_id_hex(&self) -> String {
        format!("0x{:x}", self.chain_id)
    }

    pub async fn is_dev(&self) -> bool {
        let provider = self.get_alloy_provider().await.unwrap();
        // TODO cache node_info for entire chain
        self.chain_id == 31337 || provider.anvil_node_info().await.is_ok()
    }

    pub async fn get_alloy_provider(&self) -> Result<RootProvider<BoxTransport>> {
        Ok(ProviderBuilder::new().on_builtin(&self.http_url).await?)
    }

    pub fn get_provider(&self) -> RootProvider<RetryBackoffService<Http<Client>>> {
        let url = Url::parse(&self.http_url).unwrap();

        //let url = Url::parse(&self.http_url).unwrap();
        let client = ClientBuilder::default()
            .layer(RetryBackoffLayer::new(10, 500, 300))
            .http(url);

        ProviderBuilder::new().on_client(client)
        //let url = Url::parse(&self.http_url).unwrap();
        //let http = Http::new(url);
        //let policy = Box::<HttpRateLimitRetryPolicy>::default();
        //let client = RetryClientBuilder::default()
        //    .rate_limit_retries(10)
        //    .timeout_retries(3)
        //    .initial_backoff(Duration::from_millis(500))
        //    .build(http, policy);
        //Provider::new(client)
    }

    pub async fn reset_listener(&mut self) -> Result<()> {
        if self.is_dev().await {
            let http = Url::parse(&self.http_url)?;
            let ws = Url::parse(&self.ws_url.clone().unwrap())?;
            ethui_broadcast::reset_anvil_listener(self.chain_id, http, ws).await;
        }

        Ok(())
    }
}

impl std::fmt::Display for Network {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}-{}", self.chain_id, self.name)
    }
}

fn default_force_is_anvil() -> bool {
    false
}
