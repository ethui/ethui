use crate::{Error, Result};
use ethui_dialogs::{Dialog, DialogMsg};
use ethui_networks::{Network, Networks};
use ethui_types::{GlobalState, U64};
use serde::{Deserialize, Serialize};
use url::Url;

#[derive(Debug)]
pub struct ChainUpdate {
    network: Network,
}

#[derive(Debug, Serialize)]
pub struct NetworkSwitch {
    pub current_id: u32,
    pub current_name: String,
    pub new_id: u32,
    pub new_name: String,
}

impl ChainUpdate {
    pub fn build() -> ChainUpdateBuilder {
        ChainUpdateBuilder::default()
    }

    pub async fn run(self) -> Result<()> {
        if self.already_active().await {
            return Ok(());
        } else if self.already_exists().await {
            let switch_data = self.get_switch_data().await;
            let switch_dialog =
                Dialog::new("chain-switch", serde_json::to_value(switch_data).unwrap());
            switch_dialog.open().await?;

            while let Some(msg) = switch_dialog.recv().await {
                match msg {
                    DialogMsg::Data(msg) => {
                        if let Some("accept") = msg.as_str() {
                            self.switch_on_accept().await?;
                            break;
                        }
                    }
                    DialogMsg::Close => return Err(Error::UserRejectedDialog),
                }
            }
            return Ok(());
        } else {
            let add_dialog = Dialog::new("chain-add", serde_json::to_value(&self.network).unwrap());
            add_dialog.open().await?;

            let mut add_accepted = false;
            while let Some(msg) = add_dialog.recv().await {
                match msg {
                    DialogMsg::Data(msg) => {
                        if let Some("accept") = msg.as_str() {
                            self.add_on_accept().await?;
                            add_accepted = true;
                            break;
                        }
                    }
                    DialogMsg::Close => return Err(Error::UserRejectedDialog),
                }
            }
            if add_accepted {
                add_dialog.close().await?;
                let switch_data = self.get_switch_data().await;
                let switch_dialog =
                    Dialog::new("chain-switch", serde_json::to_value(switch_data).unwrap());
                switch_dialog.open().await?;

                while let Some(msg) = switch_dialog.recv().await {
                    match msg {
                        DialogMsg::Data(msg) => {
                            if let Some("accept") = msg.as_str() {
                                self.switch_on_accept().await?;
                                break;
                            }
                        }
                        DialogMsg::Close => return Err(Error::UserRejectedDialog),
                    }
                }
            }
        }

        Ok(())
    }

    pub async fn get_switch_data(&self) -> NetworkSwitch {
        let networks = Networks::read().await;
        let current_chain = networks.get_current();
        NetworkSwitch {
            current_id: current_chain.chain_id,
            current_name: current_chain.name.to_string(),
            new_id: self.network.chain_id,
            new_name: self.network.clone().name,
        }
    }

    pub async fn already_active(&self) -> bool {
        let networks = Networks::read().await;
        networks.get_current().chain_id == self.network.chain_id
    }

    pub async fn already_exists(&self) -> bool {
        let networks = Networks::read().await;
        networks.validate_chain_id(self.network.chain_id)
    }

    pub async fn switch_on_accept(&self) -> Result<()> {
        let _ = Networks::write()
            .await
            .set_current_by_id(self.network.chain_id)
            .await;

        Ok(())
    }

    pub async fn add_on_accept(&self) -> Result<()> {
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
            force_is_anvil: false,
        })
    }
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
