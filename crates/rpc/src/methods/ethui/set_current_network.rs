use ethui_connections::Ctx;
use ethui_networks::{NetworksActorExt as _, networks};
use ethui_types::prelude::*;
use jsonrpc_core::Params as RpcParams;
use serde::Deserialize;

use crate::{Error, Result, methods::Method, params::extract_single_param};

/// Switches ethui's current network by name.
///
/// `wallet_switchEthereumChain` stays the dApp-facing way to do this, but it
/// keys on chain id, which cannot pick between two networks that share one —
/// including stacks. A name can.
#[derive(Debug)]
pub(crate) struct SetCurrentNetwork {
    name: String,
}

impl Method for SetCurrentNetwork {
    async fn build(params: RpcParams, _ctx: Ctx) -> Result<Self> {
        let parsed: Params = serde_json::from_value(extract_single_param(params))?;

        Ok(Self { name: parsed.name })
    }

    async fn run(self) -> Result<Json> {
        let networks = networks();

        networks
            .set_current(self.name.clone())
            .await
            .map_err(|e| Error::Ethui(eyre!("failed to switch to {:?}: {}", self.name, e)))?;

        let current = networks
            .get_current()
            .await
            .map_err(|e| Error::Ethui(eyre!("failed to read the current network: {}", e)))?;

        Ok(json!(current))
    }
}

#[derive(Deserialize)]
struct Params {
    name: String,
}
