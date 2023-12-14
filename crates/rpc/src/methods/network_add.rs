use ethers::types::U64;
use iron_networks::{Network, Networks};
use iron_types::GlobalState;
use serde::Deserialize;
use url::Url;

use crate::{Error, Result};

#[derive(Debug)]
pub struct NetworkAdd {
    params: Params,
}

impl NetworkAdd {
    pub fn build() -> NetworkAddBuilder {
        NetworkAddBuilder::default()
    }

    pub async fn run(self) -> Result<()> {
        let mut networks = Networks::write().await;
        networks.add_network(self.params.try_into()?).await?;

        Ok(())
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Params {
    chain_id: U64,
    chain_name: String,
    native_currency: Currency,
    block_explorer_urls: Vec<Url>,
    rpc_urls: Vec<Url>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Currency {
    decimals: u64,
    // name: String,
    symbol: String,
}

#[derive(Default)]
pub struct NetworkAddBuilder {
    params: Option<Params>,
}

impl TryFrom<Params> for Network {
    type Error = Error;
    fn try_from(params: Params) -> Result<Self> {
        Ok(Self {
            name: params.chain_name,
            chain_id: params.chain_id.as_u32(),
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

impl NetworkAddBuilder {
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

    pub async fn build(self) -> NetworkAdd {
        NetworkAdd {
            params: self.params.unwrap(),
        }
    }
}