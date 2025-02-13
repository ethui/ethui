use ethui_dialogs::{Dialog, DialogMsg};
use ethui_networks::Networks;
use ethui_types::{GlobalState, Network, U64};
use serde::{Deserialize, Serialize};
use tracing::info;
use url::Url;

use crate::{Error, Result};

#[derive(Debug)]
pub struct ChainAdd {
    network: Network,
}

impl ChainAdd {
    pub fn build() -> ChainAddBuilder {
        ChainAddBuilder::default()
    }

    #[tracing::instrument(skip(self))]
    pub async fn run(self) -> Result<()> {
        if self.already_exists().await {
            info!("Network already exists");
            return Ok(());
        }

        let dialog = Dialog::new("chain-add", serde_json::to_value(&self.network).unwrap());
        dialog.open().await?;

        while let Some(msg) = dialog.recv().await {
            match msg {
                DialogMsg::Data(msg) => {
                    if let Some("accept") = msg.as_str() {
                        self.on_accept().await?;
                        break;
                    }
                }

                DialogMsg::Close => break,
            }
        }

        Ok(())
    }

    pub async fn already_exists(&self) -> bool {
        let networks = Networks::read().await;
        networks.validate_chain_id(self.network.chain_id)
    }

    pub async fn on_accept(&self) -> Result<()> {
        let mut networks = Networks::write().await;
        networks.add_network(self.network.clone()).await?;

        Ok(())
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Params {
    chain_id: U64,
    chain_name: String,
    rpc_urls: Vec<Url>,
    native_currency: Currency,
    block_explorer_urls: Vec<Url>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Currency {
    name: String,
    symbol: String,
    decimals: u64,
}

#[derive(Debug, Default)]
pub struct ChainAddBuilder {
    params: Option<Params>,
}

impl ChainAddBuilder {
    pub fn set_params(mut self, params: serde_json::Value) -> Result<Self> {
        let params: serde_json::Value = if params.is_array() {
            params.as_array().unwrap()[0].clone()
        } else {
            params
        };

        self.params = Some(serde_json::from_value(params)?);
        Ok(self)
    }

    pub fn build(self) -> ChainAdd {
        ChainAdd {
            network: self.params.unwrap().try_into().unwrap(),
        }
    }
}

impl TryFrom<Params> for Network {
    type Error = Error;
    fn try_from(params: Params) -> Result<Self> {
        Ok(Self {
            name: params.chain_name,
            chain_id: params.chain_id.try_into().unwrap(),
            explorer_url: params.block_explorer_urls.first().map(|u| u.to_string()),
            http_url: params
                .rpc_urls
                .iter()
                .find(|s| s.scheme().starts_with("http"))
                .cloned()
                .expect("http url not found")
                .to_string(),
            ws_url: params
                .rpc_urls
                .iter()
                .find(|s| s.scheme().starts_with("ws"))
                .cloned()
                .map(|s| s.to_string()),
            currency: params.native_currency.symbol,
            decimals: params.native_currency.decimals as u32,
        })
    }
}
