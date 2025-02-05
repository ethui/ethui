use crate::{Error, Result};
use ethui_dialogs::{Dialog, DialogMsg};
use ethui_networks::{Network, Networks};
use ethui_types::GlobalState;
use serde::Serialize;

use super::chain_add::Params;

#[derive(Debug)]
pub struct ChainUpdate {
    network: Network,
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
            let add_dialog = Dialog::new("chain-add", serde_json::to_value(&self.network).unwrap());
            add_dialog.open().await?;

            while let Some(msg) = add_dialog.recv().await {
                match msg {
                    DialogMsg::Data(msg) => {
                        if let Some("accept") = msg.as_str() {
                            let mut networks = Networks::write().await;
                            networks.add_network(self.network.clone()).await?;
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
                        networks.set_current_by_id(self.network.chain_id).await?;
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
            old_id: current_chain.chain_id,
            new_id: self.network.chain_id,
        }
    }

    async fn already_active(&self) -> bool {
        let networks = Networks::read().await;
        networks.get_current().chain_id == self.network.chain_id
    }

    async fn already_exists(&self) -> bool {
        let networks = Networks::read().await;
        networks.validate_chain_id(self.network.chain_id)
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
        ChainUpdate {
            network: self.params.unwrap().try_into().unwrap(),
        }
    }
}
