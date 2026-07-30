use ethui_connections::Ctx;
use ethui_types::prelude::*;
use ethui_wallets::Wallets;
use jsonrpc_core::Params as RpcParams;

use crate::{Error, Result, methods::Method, params::extract_single_param};

/// Creates a wallet of any type the GUI supports.
///
/// The params are forwarded verbatim to `Wallets::create`, which dispatches on
/// `params["type"]` — the same path the Tauri command takes — so the per-type
/// shapes stay defined in one place instead of being mirrored here.
///
/// Registered with the redacting variant of the handler macro: several of
/// those types carry a mnemonic or private key, and the ordinary macro logs
/// params verbatim.
#[derive(Debug)]
pub(crate) struct CreateWallet {
    params: Json,
}

impl Method for CreateWallet {
    async fn build(params: RpcParams, _ctx: Ctx) -> Result<Self> {
        Ok(Self {
            params: extract_single_param(params),
        })
    }

    async fn run(self) -> Result<Json> {
        let name = self.params["name"].as_str().unwrap_or_default().to_owned();

        Wallets::write()
            .await
            .create(self.params)
            .await
            .map_err(|e| Error::Ethui(eyre!("failed to create wallet: {}", e)))?;

        // Echoing the name back rather than the wallet: the caller needs
        // something to pass to `ethui_setCurrentWallet`, and nothing else here
        // is safe to return.
        Ok(json!({ "name": name }))
    }
}
