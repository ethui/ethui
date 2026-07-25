use ethui_connections::Ctx;
use ethui_settings::{SettingsActorExt as _, settings};
use ethui_types::prelude::*;
use jsonrpc_core::Params as RpcParams;
use serde::Deserialize;

use crate::{Error, Result, methods::Method, params::extract_single_param};

/// Toggles Fast Mode, which is what lets ethui skip approval dialogs for a dev
/// wallet on a dev network. Local tier only: this is the switch that disarms
/// the other gates, so a web origin must never reach it.
#[derive(Debug)]
pub(crate) struct SetFastMode {
    enabled: bool,
}

impl Method for SetFastMode {
    async fn build(params: RpcParams, _ctx: Ctx) -> Result<Self> {
        let parsed: Params = serde_json::from_value(extract_single_param(params))?;

        Ok(Self {
            enabled: parsed.enabled,
        })
    }

    async fn run(self) -> Result<Json> {
        settings()
            .set_fast_mode(self.enabled)
            .await
            .map_err(|e| Error::Ethui(eyre!("Failed to set fast mode: {}", e)))?;

        Ok(Json::Null)
    }
}

#[derive(Deserialize)]
struct Params {
    enabled: bool,
}
