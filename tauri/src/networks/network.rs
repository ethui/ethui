use std::sync::{Arc, Mutex};

use ethers::providers::{Http, Provider};
use serde::{Deserialize, Serialize};
use tokio::sync::mpsc;
use url::Url;

use super::{Error, Result};
use crate::live_networks_listener::LiveNetworksListener;
use crate::{app, block_listener::BlockListener, db::DB};

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Network {
    pub name: String,
    pub chain_id: u32,
    pub explorer_url: Option<String>,
    pub http_url: String,
    pub ws_url: Option<String>,
    pub currency: String,
    pub decimals: u32,
    pub alchemy_url: Option<String>,

    #[serde(skip)]
    listener: Option<Arc<Mutex<BlockListener>>>,

    #[serde(skip)]
    live_listener: Option<Arc<Mutex<LiveNetworksListener>>>,
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
            listener: None,
            live_listener: None,
            alchemy_url: None,
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
            listener: None,
            live_listener: None,
            alchemy_url: None,
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
            listener: None,
            live_listener: None,
            alchemy_url: None,
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

    pub fn reset_listener(
        &mut self,
        db: DB,
        window_snd: mpsc::UnboundedSender<app::Event>,
    ) -> Result<()> {
        if let Some(listener) = self.listener.as_ref() {
            listener.lock().unwrap().stop();
            self.listener = None;
        }

        if self.is_dev() {
            let http_url = Url::parse(&self.http_url)?;
            let ws_url = Url::parse(&self.ws_url.clone().unwrap())?;
            let mut listener = BlockListener::new(self.chain_id, http_url, ws_url, db, window_snd);
            listener
                .run()
                .map_err(|e| Error::ErrorRunningListener(e.to_string()))?;
            self.listener = Some(Arc::new(Mutex::new(listener)));
        } else if let Some(alchemy_url) = &self.alchemy_url {
            let alchemy_url = Url::parse(&alchemy_url)?;
            let mut listener = LiveNetworksListener::new(self.chain_id, db, alchemy_url);
            listener
                .run()
                .map_err(|e| Error::ErrorRunningListener(e.to_string()))?;
            self.live_listener = Some(Arc::new(Mutex::new(listener)));
        }

        Ok(())
    }
}

impl std::fmt::Display for Network {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}-{}", self.chain_id, self.name)
    }
}
