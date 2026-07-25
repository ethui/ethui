use ethui_connections::Ctx;
use ethui_types::prelude::*;
use ethui_wallets::{WalletControl as _, Wallets};
use jsonrpc_core::Params as RpcParams;
use serde::Deserialize;

use crate::{Error, Result, methods::Method, params::extract_single_param};

/// Switches the current wallet by name.
///
/// The underlying `set_current_wallet` takes an index, but an index read from
/// a previous `ethui_listWallets` can be stale by the time it is used — the
/// GUI mutates the same list. A name is resolved against the list as it is now.
#[derive(Debug)]
pub(crate) struct SetCurrentWallet {
    name: String,
}

impl Method for SetCurrentWallet {
    async fn build(params: RpcParams, _ctx: Ctx) -> Result<Self> {
        let parsed: Params = serde_json::from_value(extract_single_param(params))?;

        Ok(Self { name: parsed.name })
    }

    async fn run(self) -> Result<Json> {
        let index = {
            let wallets = Wallets::read().await;
            let names: Vec<String> = wallets.get_all().iter().map(|w| w.name()).collect();

            names
                .iter()
                .position(|name| *name == self.name)
                .ok_or_else(|| {
                    Error::Ethui(eyre!(
                        "unknown wallet {:?}; known wallets: {}",
                        self.name,
                        names.join(", ")
                    ))
                })?
        };

        Wallets::write()
            .await
            .set_current_wallet(index)
            .await
            .map_err(|e| Error::Ethui(eyre!("failed to set current wallet: {}", e)))?;

        Ok(Json::Null)
    }
}

#[derive(Deserialize)]
struct Params {
    name: String,
}
