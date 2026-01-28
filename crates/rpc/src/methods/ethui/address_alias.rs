use ethui_connections::Ctx;
use ethui_settings::{SettingsActorExt as _, settings};
use ethui_types::prelude::*;
use jsonrpc_core::Params as RpcParams;
use serde::Deserialize;

use crate::{params::extract_single_param, methods::Method, Error, Result};

#[derive(Debug)]
pub(crate) struct AddressAlias {
    address: Address,
}

impl Method for AddressAlias {
    async fn build(params: RpcParams, _ctx: Ctx) -> Result<Self> {
        let parsed: Params = serde_json::from_value(extract_single_param(params))?;

        Ok(Self {
            address: parsed.address,
        })
    }

    async fn run(self) -> Result<Json> {
        let alias = settings()
            .get_alias(self.address)
            .await
            .map_err(|e| Error::Ethui(eyre!("Failed to get alias: {}", e)))?;

        Ok(json!(alias))
    }
}

#[derive(Deserialize)]
struct Params {
    address: Address,
}
