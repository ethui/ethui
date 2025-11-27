use ethui_dialogs::{Dialog, DialogMsg};
use ethui_networks::{AddNetwork, ValidateChainId, ask};
use ethui_types::{NewNetworkParams, U64};
use serde::{Deserialize, Serialize};
use tracing::info;
use url::Url;

use crate::{Error, Result};

#[derive(Debug)]
pub struct ChainAdd {
    network: NewNetworkParams,
}

impl ChainAdd {
    pub fn build() -> ChainAddBuilder {
        ChainAddBuilder::default()
    }

    #[tracing::instrument(skip(self))]
    pub async fn run(self) -> Result<()> {
        // TODO how to handle dedup_id
        // if the network already exists, we may want to add a new one anyway
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
        ask(ValidateChainId(self.network.chain_id))
            .await
            .unwrap_or(false)
    }

    pub async fn on_accept(&self) -> Result<()> {
        ask(AddNetwork(self.network.clone())).await?;
        Ok(())
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Params {
    pub chain_id: U64,
    pub chain_name: String,
    pub rpc_urls: Vec<Url>,
    pub native_currency: Currency,
    pub block_explorer_urls: Option<Vec<Url>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Currency {
    pub name: String,
    pub symbol: String,
    pub decimals: u64,
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

    pub async fn build(self) -> ChainAdd {
        ChainAdd {
            network: self.params.unwrap().try_into().unwrap(),
        }
    }
}

impl TryFrom<Params> for NewNetworkParams {
    type Error = Error;
    fn try_from(params: Params) -> Result<Self> {
        Ok(Self {
            name: params.chain_name,
            // Using 0 for dedup_id since at this time no duplicate chain_id is allowed
            chain_id: TryInto::<u32>::try_into(params.chain_id).unwrap(),
            explorer_url: params
                .block_explorer_urls
                .unwrap_or_default()
                .first()
                .map(|u| u.to_string()),
            http_url: params
                .rpc_urls
                .iter()
                .find(|s| s.scheme().starts_with("http"))
                .cloned()
                .expect("http url not found"),
            ws_url: params
                .rpc_urls
                .iter()
                .find(|s| s.scheme().starts_with("ws"))
                .cloned(),
            currency: params.native_currency.symbol,
            decimals: params.native_currency.decimals as u32,
            is_stack: false,
        })
    }
}
