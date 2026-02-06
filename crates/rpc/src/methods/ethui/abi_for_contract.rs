use ethui_connections::Ctx;
use ethui_types::{Address, Json, Network};
use jsonrpc_core::Params as RpcParams;
use serde::Deserialize;
use serde_json::json;

use crate::{Result, methods::Method, params::extract_single_param};

#[derive(Debug, Deserialize)]
pub(crate) struct AbiForContract {
    network: Network,
    address: Address,
}

impl Method for AbiForContract {
    async fn build(params: RpcParams, ctx: Ctx) -> Result<Self> {
        let parsed: Params = serde_json::from_value(extract_single_param(params))?;
        let network = ctx.network().await;

        Ok(Self {
            network,
            address: parsed.address,
        })
    }

    async fn run(self) -> Result<Json> {
        let db = ethui_db::get();

        let abi = db
            .get_contract_abi(self.network.chain_id(), self.address)
            .await
            .ok();

        Ok(json!(abi))
    }
}

#[derive(Deserialize)]
struct Params {
    address: Address,
}
