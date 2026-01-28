//! RPC parameter types with automatic conversion from jsonrpc_core::Params

use ethui_connections::permissions::PermissionRequest;
use ethui_types::Json;
use jsonrpc_core::Params;
use serde::Deserialize;

use crate::{Error, Result};

/// Extracts a single parameter from RPC params.
/// Handles both array-wrapped `[{...}]` and direct `{...}` formats.
pub fn extract_single_param(params: Params) -> Json {
    let value: Json = params.into();
    if value.is_array() {
        value.as_array().unwrap()[0].clone()
    } else {
        value
    }
}

/// Empty params for RPC methods that don't take any parameters
#[derive(Debug, Default)]
pub struct Empty;

impl TryFrom<Params> for Empty {
    type Error = Error;

    fn try_from(_: Params) -> Result<Self> {
        Ok(Empty)
    }
}

/// Wrapper for PermissionRequest to implement TryFrom<Params>
#[derive(Debug, Deserialize)]
#[serde(transparent)]
pub struct PermissionRequestParams(pub PermissionRequest);

impl TryFrom<Params> for PermissionRequestParams {
    type Error = Error;

    fn try_from(params: Params) -> Result<Self> {
        Ok(Self(params.parse()?))
    }
}

impl std::ops::Deref for PermissionRequestParams {
    type Target = PermissionRequest;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl From<PermissionRequestParams> for PermissionRequest {
    fn from(params: PermissionRequestParams) -> Self {
        params.0
    }
}

/// Params for wallet_switchEthereumChain
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SwitchChainParams {
    pub chain_id: String,
}

impl TryFrom<Params> for SwitchChainParams {
    type Error = Error;

    fn try_from(params: Params) -> Result<Self> {
        let params: Vec<SwitchChainParams> = params.parse()?;
        params.into_iter().next().ok_or(Error::InvalidParams)
    }
}

impl SwitchChainParams {
    /// Parse the chain_id hex string to u64
    pub fn chain_id(&self) -> Result<u64> {
        let hex_str = self
            .chain_id
            .strip_prefix("0x")
            .ok_or(Error::InvalidParams)?;
        u64::from_str_radix(hex_str, 16).map_err(|_| Error::InvalidParams)
    }
}
