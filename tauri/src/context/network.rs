use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
};

use serde::{Deserialize, Serialize};
use tokio::sync::mpsc;
use url::Url;

use super::block_listener::BlockListener;
use crate::{app, db::DB};

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Network {
    pub name: String,
    pub chain_id: u32,
    pub dev: bool,
    pub explorer_url: Option<String>,
    pub http_url: String,
    pub ws_url: Option<String>,
    pub currency: String,
    pub decimals: u32,

    #[serde(skip)]
    listener: Option<Arc<Mutex<BlockListener>>>,
}

impl Network {
    pub fn mainnet() -> Self {
        Self {
            name: String::from("mainnet"),
            chain_id: 1,
            dev: false,
            explorer_url: Some(String::from("https://etherscan.io/search?q=")),
            http_url: String::from("https://ethereum.publicnode.com"),
            ws_url: None,
            currency: String::from("ETH"),
            decimals: 18,
            listener: None,
        }
    }

    pub fn goerli() -> Self {
        Self {
            name: String::from("goerli"),
            chain_id: 5,
            dev: false,
            explorer_url: Some(String::from("https://goerli.etherscan.io/search?q=")),
            http_url: String::from("https://rpc.ankr.com/eth_goerli"),
            ws_url: None,
            currency: String::from("ETH"),
            decimals: 18,
            listener: None,
        }
    }

    pub fn anvil() -> Self {
        Self {
            name: String::from("anvil"),
            chain_id: 31337,
            dev: true,
            explorer_url: None,
            http_url: String::from("http://localhost:8545"),
            ws_url: Some(String::from("ws://localhost:8545")),
            currency: String::from("ETH"),
            decimals: 18,
            listener: None,
        }
    }

    pub fn chain_id_hex(&self) -> String {
        format!("0x{:x}", self.chain_id)
    }

    pub fn default() -> HashMap<String, Self> {
        let mut networks = HashMap::new();
        networks.insert(String::from("mainnet"), Self::mainnet());
        networks.insert(String::from("goerli"), Self::goerli());
        networks.insert(String::from("anvil"), Self::anvil());
        networks
    }

    pub fn reset_listener(
        &mut self,
        db: &DB,
        window_snd: mpsc::UnboundedSender<app::Event>,
    ) -> crate::error::Result<()> {
        if let Some(listener) = self.listener.as_ref() {
            listener.lock().unwrap().stop();
            self.listener = None;
        }

        if self.dev {
            let http_url = Url::parse(&self.http_url)?;
            let ws_url = Url::parse(&self.ws_url.clone().unwrap())?;
            let mut listener =
                BlockListener::new(self.chain_id, http_url, ws_url, db.clone(), window_snd);
            listener.run()?;
            self.listener = Some(Arc::new(Mutex::new(listener)));
        }

        Ok(())
    }
}

impl std::fmt::Display for Network {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}-{}", self.chain_id, self.name)
    }
}
