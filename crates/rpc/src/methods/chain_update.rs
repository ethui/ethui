use ethui_dialogs::{Dialog, DialogMsg};
use ethui_networks::Networks;
use ethui_types::{GlobalState, Network, NewNetworkParams};
use serde::Serialize;

use super::chain_add::Params;
use crate::{Error, Result};

#[derive(Debug)]
pub struct ChainUpdate {
    network: Network,
    new_network_params: Option<NewNetworkParams>,
}

impl ChainUpdate {
    pub fn build() -> ChainUpdateBuilder {
        ChainUpdateBuilder::default()
    }

    pub async fn run(self) -> Result<()> {
        if self.already_active().await {
            return Ok(());
        }

        if !self.already_exists().await {
            let add_dialog = Dialog::new(
                "chain-add",
                serde_json::to_value(&self.new_network_params).unwrap(),
            );
            add_dialog.open().await?;

            while let Some(msg) = add_dialog.recv().await {
                match msg {
                    DialogMsg::Data(msg) => {
                        if let Some("accept") = msg.as_str() {
                            let mut networks = Networks::write().await;
                            networks
                                .add_network(self.new_network_params.clone().unwrap())
                                .await?;
                            break;
                        }
                    }
                    DialogMsg::Close => return Err(Error::UserRejectedDialog),
                }
            }
        }

        let switch_data = self.get_switch_data().await;
        let switch_dialog = Dialog::new("chain-switch", serde_json::to_value(switch_data).unwrap());
        switch_dialog.open().await?;

        while let Some(msg) = switch_dialog.recv().await {
            match msg {
                DialogMsg::Data(msg) => {
                    if let Some("accept") = msg.as_str() {
                        let mut networks = Networks::write().await;
                        networks
                            .set_current_by_dedup_chain_id(self.network.dedup_chain_id())
                            .await?;
                        break;
                    }
                }
                DialogMsg::Close => return Err(Error::UserRejectedDialog),
            }
        }

        Ok(())
    }

    pub async fn get_switch_data(&self) -> NetworkSwitch {
        let networks = Networks::read().await;
        let current_chain = networks.get_current();
        NetworkSwitch {
            old_id: current_chain.chain_id(),
            new_id: self.network.chain_id(),
        }
    }

    async fn already_active(&self) -> bool {
        let networks = Networks::read().await;
        networks.get_current().chain_id() == self.network.chain_id()
    }

    async fn already_exists(&self) -> bool {
        let networks = Networks::read().await;
        networks.get_network_by_name(&self.network.name).is_some()
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NetworkSwitch {
    pub old_id: u32,
    pub new_id: u32,
}

#[derive(Default)]
pub struct ChainUpdateBuilder {
    params: Option<Params>,
}

impl ChainUpdateBuilder {
    pub fn set_params(mut self, params: serde_json::Value) -> Result<Self> {
        let params: serde_json::Value = if params.is_array() {
            params.as_array().unwrap()[0].clone()
        } else {
            params
        };

        self.params = Some(serde_json::from_value(params)?);
        Ok(self)
    }

    pub async fn build(self) -> ChainUpdate {
        let networks = Networks::read().await;
        let params = self.params.unwrap();
        let chain_name = params.chain_name.clone();

        let chain_id = TryInto::<u32>::try_into(params.chain_id).unwrap();
        let new_network_params = NewNetworkParams {
            dedup_chain_id: (chain_id, 0u32).into(),
            name: chain_name.clone(),
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
        };

        let deduplication_id = networks
            .get_network_by_name(&chain_name)
            .map(|network| network.dedup_chain_id().dedup_id());

        ChainUpdate {
            network: new_network_params
                .clone()
                .into_network(deduplication_id.unwrap_or_default()),
            new_network_params: Some(new_network_params),
        }
    }
}
