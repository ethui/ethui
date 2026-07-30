use ethui_connections::Ctx;
use ethui_types::prelude::*;
use ethui_wallets::Wallets;
use jsonrpc_core::Params as RpcParams;
use serde::Deserialize;

use crate::{Error, Result, methods::Method, params::extract_single_param};

/// Switches the active derivation path within the current wallet. The key is
/// one of the `paths[].key` values `ethui_listWallets` returns.
#[derive(Debug)]
pub(crate) struct SetCurrentPath {
    key: String,
}

impl Method for SetCurrentPath {
    async fn build(params: RpcParams, _ctx: Ctx) -> Result<Self> {
        let parsed: Params = serde_json::from_value(extract_single_param(params))?;

        Ok(Self { key: parsed.key })
    }

    async fn run(self) -> Result<Json> {
        Wallets::write()
            .await
            .set_current_path(self.key.clone())
            .await
            .map_err(|e| Error::Ethui(eyre!("failed to set path {:?}: {}", self.key, e)))?;

        Ok(Json::Null)
    }
}

#[derive(Deserialize)]
struct Params {
    key: String,
}
