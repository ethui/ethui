use ethui_dialogs::{Dialog, DialogMsg};
use ethui_networks::{Network, Networks};
use ethui_types::{GlobalState, U64};
use serde::{Deserialize, Serialize};
use url::Url;
use crate::{Error, Result};

#[derive(Debug)]
pub struct ChainUpdate {
    network: Network,
}

impl ChainUpdate {
    pub fn build() -> ChainUpdateBuilder {
        ChainUpdateBuilder::default()
    }

    pub async fn run(self) -> Result<()> {
        let dialog = Dialog::new("chain-update", serde_json::to_value(&self.network).unwrap());
        dialog.open().await?;

        if self.already_exists().await {

            return Ok(());
        }

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
    native_currency: Currency,
    block_explorer_urls: Vec<Url>,
    rpc_urls: Vec<Url>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Currency {
    decimals: u64,
    name: Option<String>,
    symbol: String,
}

#[derive(Default)]
pub struct ChainUpdateBuilder {
    params: Option<Params>,
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
                .first()
                .map(|s| s.to_string())
                .ok_or(Error::Rpc(-32602))?,
            ws_url: None,
            currency: params.native_currency.symbol,
            decimals: params.native_currency.decimals as u32,
        })
    }
}

impl ChainUpdateBuilder {
    pub fn set_params(mut self, params: serde_json::Value) -> Result<Self> {
        // TODO: why is this an array?
        let params: serde_json::Value = if params.is_array() {
            params.as_array().unwrap()[0].clone()
        } else {
            params
        };

        self.params = Some(serde_json::from_value(params)?);
        Ok(self)
    }

    pub async fn build(self) -> ChainUpdate {
        ChainUpdate {
            network: self.params.unwrap().try_into().unwrap(),
        }
    }
}
