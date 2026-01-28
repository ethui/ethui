use ethui_connections::Ctx;
use ethui_dialogs::{Dialog, DialogMsg};
use ethui_networks::{NetworksActorExt as _, networks};
use ethui_types::{Json, NewNetworkParams, U64};
use jsonrpc_core::Params as RpcParams;
use serde::{Deserialize, Serialize};
use tracing::info;
use url::Url;

use crate::{Error, Result, methods::Method, params::extract_single_param};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Currency {
    pub name: String,
    pub symbol: String,
    pub decimals: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ChainAdd {
    chain_id: U64,
    chain_name: String,
    rpc_urls: Vec<Url>,
    native_currency: Currency,
    block_explorer_urls: Option<Vec<Url>>,
}

impl Method for ChainAdd {
    async fn build(params: RpcParams, _ctx: Ctx) -> Result<Self> {
        Ok(serde_json::from_value(extract_single_param(params))?)
    }

    #[tracing::instrument(skip(self))]
    async fn run(self) -> Result<Json> {
        let network: NewNetworkParams = self.clone().try_into()?;

        // TODO how to handle dedup_id
        // if the network already exists, we may want to add a new one anyway
        if self.already_exists().await? {
            info!("Network already exists");
            return Ok(Json::Null);
        }

        let dialog = Dialog::new("chain-add", serde_json::to_value(&network)?);
        dialog.open().await?;

        while let Some(msg) = dialog.recv().await {
            match msg {
                DialogMsg::Data(msg) => {
                    if let Some("accept") = msg.as_str() {
                        networks().add(network).await?;
                        break;
                    }
                }

                DialogMsg::Close => break,
            }
        }

        Ok(Json::Null)
    }
}

impl ChainAdd {
    async fn already_exists(&self) -> Result<bool> {
        let chain_id: u64 = self.chain_id.try_into().map_err(|_| Error::ParseError)?;
        Ok(networks().validate_chain_id(chain_id).await?)
    }
}

impl TryFrom<ChainAdd> for NewNetworkParams {
    type Error = Error;
    fn try_from(params: ChainAdd) -> Result<Self> {
        Ok(Self {
            name: params.chain_name,
            // Using 0 for dedup_id since at this time no duplicate chain_id is allowed
            chain_id: TryInto::<u64>::try_into(params.chain_id).map_err(|_| Error::ParseError)?,
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
