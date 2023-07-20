use ethers::providers::{Http, Provider};
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
}

impl Network {
    pub fn mainnet() -> Self {
        Self {
            name: String::from("mainnet"),
            chain_id: 1,
            explorer_url: Some(String::from("https://etherscan.io/search?q=")),
            http_url: String::from("https://ethereum.publicnode.com"),
            ws_url: None,
            currency: String::from("ETH"),
            decimals: 18,
        }
    }

    pub fn goerli() -> Self {
        Self {
            name: String::from("goerli"),
            chain_id: 5,
            explorer_url: Some(String::from("https://goerli.etherscan.io/search?q=")),
            http_url: String::from("https://rpc.ankr.com/eth_goerli"),
            ws_url: None,
            currency: String::from("ETH"),
            decimals: 18,
        }
    }

    pub fn anvil() -> Self {
        Self {
            name: String::from("anvil"),
            chain_id: 31337,
            explorer_url: None,
            http_url: String::from("http://localhost:8545"),
            ws_url: Some(String::from("ws://localhost:8545")),
            currency: String::from("ETH"),
            decimals: 18,
        }
    }

    pub fn all_default() -> Vec<Self> {
        vec![Self::anvil(), Self::mainnet(), Self::goerli()]
    }

    pub fn chain_id_hex(&self) -> String {
        format!("0x{:x}", self.chain_id)
    }

    pub fn is_dev(&self) -> bool {
        self.chain_id == 31337
    }

    pub fn get_provider(&self) -> Provider<Http> {
        Provider::<Http>::try_from(self.http_url.clone()).unwrap()
    }

    pub async fn reset_listener(&mut self) -> Result<()> {
        if self.is_dev() {
            let http = Url::parse(&self.http_url)?;
            let ws = Url::parse(&self.ws_url.clone().unwrap())?;
            iron_broadcast::reset_anvil_listener(self.chain_id, http, ws).await;
        }

        Ok(())
    }
}

impl std::fmt::Display for Network {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}-{}", self.chain_id, self.name)
    }
}
