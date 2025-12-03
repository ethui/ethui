use common::{Address, Network};
use serde::Deserialize;
use serde_json::json;

use crate::error::{Error, Result};

#[derive(Debug)]
pub struct AbiForContract {
    network: Network,
    address: Address,
}

impl AbiForContract {
    pub fn build() -> Builder {
        Builder::default()
    }

    pub async fn run(self) -> Result<serde_json::Value> {
        let db = db::get();

        let abi = db
            .get_contract_abi(self.network.chain_id(), self.address)
            .await
            .ok();

        Ok(json!(abi))
    }
}

#[derive(Default)]
pub struct Builder {
    network: Option<Network>,
    params: Option<serde_json::Value>,
}

impl Builder {
    pub fn set_network(mut self, network: Network) -> Self {
        self.network = Some(network);
        self
    }

    pub fn set_params(mut self, params: serde_json::Value) -> Self {
        self.params = Some(params);
        self
    }

    pub fn build(self) -> Result<AbiForContract> {
        let network = self.network.ok_or(Error::InvalidParams)?;

        let params = self.params.ok_or(Error::InvalidParams)?;
        let parsed_params: ParsedParams =
            serde_json::from_value(params).map_err(|_| Error::InvalidParams)?;

        Ok(AbiForContract {
            network,
            address: parsed_params.address,
        })
    }
}

#[derive(Deserialize)]
pub struct ParsedParams {
    address: Address,
}
