use ethui_connections::Ctx;
use ethui_dialogs::{Dialog, DialogMsg};
use ethui_networks::{NetworksActorExt as _, networks};
use ethui_types::{Json, Network, NewNetworkParams, U64};
use jsonrpc_core::Params as RpcParams;
use serde::{Deserialize, Serialize};
use url::Url;

use super::chain_add::Currency;
use crate::{Error, Result, methods::Method, params::extract_single_param, utils};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct NetworkSwitch {
    old_id: u64,
    new_id: u64,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ChainUpdate {
    chain_id: U64,
    chain_name: String,
    rpc_urls: Vec<Url>,
    native_currency: Currency,
    block_explorer_urls: Option<Vec<Url>>,
}

impl Method for ChainUpdate {
    async fn build(params: RpcParams, _ctx: Ctx) -> Result<Self> {
        Ok(serde_json::from_value(extract_single_param(params))?)
    }

    async fn run(self) -> Result<Json> {
        let (network, new_network_params) = self.build_network().await?;

        if self.already_active(&network).await {
            return Ok(true.into());
        }

        if !self.already_exists(&network).await? {
            let add_dialog = Dialog::new("chain-add", serde_json::to_value(&new_network_params)?);
            add_dialog.open().await?;

            while let Some(msg) = add_dialog.recv().await {
                match msg {
                    DialogMsg::Data(msg) => {
                        if let Some("accept") = msg.as_str() {
                            networks().add(new_network_params.clone()).await?;
                            break;
                        }
                    }
                    DialogMsg::Close => return Err(Error::UserRejectedDialog),
                }
            }
        }

        let switch_data = self.get_switch_data(&network).await;
        let switch_dialog = Dialog::new("chain-switch", serde_json::to_value(switch_data)?);
        switch_dialog.open().await?;

        while let Some(msg) = switch_dialog.recv().await {
            match msg {
                DialogMsg::Data(msg) => {
                    if let Some("accept") = msg.as_str() {
                        networks().set_current(network.id()).await?;
                        break;
                    }
                }
                DialogMsg::Close => return Err(Error::UserRejectedDialog),
            }
        }

        Ok(Json::Null)
    }
}

impl ChainUpdate {
    async fn build_network(&self) -> Result<(Network, NewNetworkParams)> {
        let chain_name = self.chain_name.clone();

        let chain_id = TryInto::<u64>::try_into(self.chain_id).map_err(|_| Error::ParseError)?;
        let new_network_params = NewNetworkParams {
            chain_id,
            name: chain_name.clone(),
            explorer_url: self
                .block_explorer_urls
                .clone()
                .unwrap_or_default()
                .first()
                .map(|u| u.to_string()),
            http_url: self
                .rpc_urls
                .iter()
                .find(|s| s.scheme().starts_with("http"))
                .cloned()
                .expect("http url not found"),
            ws_url: self
                .rpc_urls
                .iter()
                .find(|s| s.scheme().starts_with("ws"))
                .cloned(),
            currency: self.native_currency.symbol.clone(),
            decimals: self.native_currency.decimals as u32,
            is_stack: false,
        };

        let dedup_id = networks()
            .get(chain_name)
            .await?
            .map(|network| network.id().dedup_id())
            .unwrap_or(0);

        Ok((
            new_network_params.clone().into_network(dedup_id),
            new_network_params,
        ))
    }

    async fn get_switch_data(&self, network: &Network) -> NetworkSwitch {
        let current_chain = utils::get_current_network().await;
        NetworkSwitch {
            old_id: current_chain.chain_id(),
            new_id: network.chain_id(),
        }
    }

    async fn already_active(&self, network: &Network) -> bool {
        utils::get_current_network().await.chain_id() == network.chain_id()
    }

    async fn already_exists(&self, network: &Network) -> Result<bool> {
        Ok(networks().get(network.name.clone()).await?.is_some())
    }
}
