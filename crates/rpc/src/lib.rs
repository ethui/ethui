pub mod commands;
mod error;
mod methods;
mod params;
mod utils;

use alloy::providers::Provider as _;
use ethui_connections::Ctx;
pub use ethui_connections::Trust;
use ethui_types::prelude::*;
use ethui_wallets::{WalletControl, Wallets};
use jsonrpc_core::{MetaIoHandler, Params};
use serde_json::json;

pub use self::error::{Error, Result};
use self::{
    methods::Method,
    params::{Empty, PermissionRequestParams, SwitchChainParams},
};

pub struct Handler {
    io: MetaIoHandler<Ctx>,
    ctx: Ctx,

    /// Filled by `local_method!` as it registers, so the local tier cannot
    /// drift from a hand-maintained list of which methods are in it.
    local_names: Vec<String>,
}

impl Handler {
    /// `trust` decides whether this connection can see local-only methods, and
    /// is the caller's to establish — the ws server from a token it verified,
    /// WalletConnect from the fact that a remote peer can never be local.
    pub fn new(domain: Option<String>, trust: Trust) -> Self {
        let mut res = Self {
            io: MetaIoHandler::default(),
            ctx: Ctx {
                domain,
                trust,
                ..Default::default()
            },
            local_names: Vec::new(),
        };
        res.add_handlers();
        res
    }

    pub async fn handle(&self, request: jsonrpc_core::Request) -> Option<jsonrpc_core::Response> {
        self.io.handle_rpc_request(request, self.ctx.clone()).await
    }

    /// Names of every RPC method this handler has registered, local tier
    /// included. This is the registry, not what any given caller may reach —
    /// see [`Self::served_method_names`] for that.
    pub fn method_names(&self) -> impl Iterator<Item = &str> {
        self.io.iter().map(|(name, _)| name.as_str())
    }

    /// Names of the methods *this* handler's connection may actually call —
    /// used to filter method lists a caller (e.g. WalletConnect) claims to need
    /// down to what ethui will serve it, instead of blindly trusting the
    /// request.
    ///
    /// An `Origin` connection never sees the local tier, so nothing can
    /// advertise those methods to a dApp by accident.
    pub fn served_method_names(&self) -> impl Iterator<Item = &str> {
        let local = self.ctx.trust == Trust::Local;

        self.io
            .iter()
            .map(|(name, _)| name.as_str())
            .filter(move |name| local || !self.local_names.iter().any(|n| n == name))
    }

    fn add_handlers(&mut self) {
        macro_rules! self_handler {
            // For handlers where params can be converted directly (TryFrom<Params>)
            ($name:literal, $fn:path) => {
                self.io
                    .add_method_with_meta($name, |params: Params, ctx: Ctx| async move {
                        info!(method = $name, params = serde_json::to_string(&params).unwrap());
                        let ret = $fn(params.try_into()?, ctx).await;
                        info!(result = ?ret);
                        ret.map_err(Into::into)
                    });
            };
        }

        // For methods implementing the Method trait
        macro_rules! method_handler {
            ($name:literal, $method:ty) => {
                self.io
                    .add_method_with_meta($name, |params: Params, ctx: Ctx| async move {
                        info!(method = $name, params = serde_json::to_string(&params).unwrap());
                        let method = <$method as Method>::build(params, ctx).await?;
                        let ret = method.run().await;
                        info!(result = ?ret);
                        ret.map_err(Into::into)
                    });
            };
        }

        // Like `method_handler!`, but only for callers ethui has established as
        // local. Everyone else gets method-not-found rather than a refusal:
        // a web origin should not be able to learn that these exist.
        //
        // The `redact` form is for methods whose params carry key material.
        // The ordinary logging below writes params verbatim into a file that
        // `logging_get_snapshot` reads back, so a mnemonic passed to an
        // un-redacted handler would end up on disk in the clear.
        macro_rules! local_method {
            ($name:literal, $method:ty) => {
                local_method!(@register $name, $method, |params: &Params| {
                    serde_json::to_string(params).unwrap()
                });
            };

            ($name:literal, $method:ty, redact) => {
                local_method!(@register $name, $method, |params: &Params| {
                    let value: Json = params.clone().into();
                    let kind = value
                        .get(0)
                        .unwrap_or(&value)
                        .get("type")
                        .and_then(|t| t.as_str())
                        .unwrap_or("unknown");

                    format!(r#"{{"type":"{kind}","<rest>":"[redacted]"}}"#)
                });
            };

            (@register $name:literal, $method:ty, $render:expr) => {
                self.local_names.push($name.to_string());

                self.io
                    .add_method_with_meta($name, |params: Params, ctx: Ctx| async move {
                        if ctx.trust != Trust::Local {
                            return Err(jsonrpc_core::Error::method_not_found());
                        }

                        let render: fn(&Params) -> String = $render;
                        info!(method = $name, params = render(&params));
                        let method = <$method as Method>::build(params, ctx).await?;
                        let ret = method.run().await;
                        info!(result = ?ret);
                        ret.map_err(Into::into)
                    });
            };
        }

        macro_rules! provider_handler {
            ($name:literal) => {
                self.io
                    .add_method_with_meta($name, |params: Params, ctx: Ctx| async move {
                        let provider = ctx.network().await.get_provider();

                        let res: jsonrpc_core::Result<Json> = provider
                            .raw_request::<_, Json>($name.into(), params)
                            .await
                            .map_err(error::alloy_to_jsonrpc_error);
                        res
                    });
            };
        }

        // gossip methods
        provider_handler!("eth_blockNumber");
        provider_handler!("eth_sendRawTransaction");

        // state methods
        // delegate directly to provider
        provider_handler!("eth_getBalance");
        provider_handler!("eth_getStorageAt");
        provider_handler!("eth_getTransactionCount");
        provider_handler!("eth_getCode");
        provider_handler!("eth_call");
        provider_handler!("eth_estimateGas");
        provider_handler!("eth_protocolVersion");
        provider_handler!("eth_syncing");
        provider_handler!("eth_mining");
        provider_handler!("net_version");

        // history methods
        // delegate directly to provider
        provider_handler!("eth_getBlockTransactionCountByHash");
        provider_handler!("eth_getBlockTransactionCountByNumber");
        provider_handler!("eth_getUncleCountByBlockHash");
        provider_handler!("eth_getUncleCountByBlockNumber");
        provider_handler!("eth_getBlockByHash");
        provider_handler!("eth_getBlockByNumber");
        provider_handler!("eth_getTransactionByHash");
        provider_handler!("eth_getTransactionByBlockHashAndIndex");
        provider_handler!("eth_getTransactionByBlockNumberAndIndex");
        provider_handler!("eth_getTransactionReceipt");
        provider_handler!("eth_getUncleByBlockHashAndIndex");
        provider_handler!("eth_getUncleByBlockNumberAndIndex");

        // filter methods
        // delegate directly to provider
        provider_handler!("eth_newFilter");
        provider_handler!("eth_newBlockFilter");
        provider_handler!("eth_newPendingFilter");
        provider_handler!("eth_uninstallFilter");
        provider_handler!("eth_getFilterLogs");
        provider_handler!("eth_getLogs");

        // handle internally
        self_handler!("eth_accounts", Self::accounts);
        self_handler!("eth_requestAccounts", Self::accounts);
        self_handler!("eth_chainId", Self::chain_id);
        method_handler!("eth_sendTransaction", methods::SendTransaction);
        method_handler!("eth_sign", methods::EthSign);
        method_handler!("personal_sign", methods::EthSign);
        method_handler!("eth_signTypedData", methods::EthSignTypedData);
        method_handler!("eth_signTypedData_v4", methods::EthSignTypedData);
        self_handler!("wallet_requestPermissions", Self::request_permissions);
        self_handler!("wallet_revokePermissions", Self::revoke_permissions);
        self_handler!("wallet_getPermissions", Self::get_permissions);
        method_handler!("wallet_addEthereumChain", methods::ChainAdd);
        method_handler!("wallet_updateEthereumChain", methods::ChainUpdate);
        self_handler!("wallet_switchEthereumChain", Self::switch_chain);
        method_handler!("wallet_watchAsset", methods::TokenAdd);

        // metamask
        self_handler!("metamask_getProviderState", Self::metamask_provider_state);

        // not yet implemented
        self_handler!("web3_clientVersion", Self::unimplemented);
        self_handler!("web3_sha3", Self::unimplemented);
        self_handler!("net_listening", Self::unimplemented);
        self_handler!("net_peerCount", Self::unimplemented);
        self_handler!("eth_gasPrice", Self::unimplemented);
        self_handler!("eth_signTransaction", Self::unimplemented);

        self_handler!("ethui_getProviderState", Self::ethui_provider_state);
        method_handler!("ethui_getContractAbi", methods::ethui::AbiForContract);
        method_handler!("ethui_getAddressAlias", methods::ethui::AddressAlias);

        #[cfg(feature = "forge-traces")]
        method_handler!("ethui_forgeTestSubmitRun", methods::ethui::ForgeTestTraces);

        // Local tier — see `local_method!`. Not reachable from a web origin.
        local_method!("ethui_listWallets", methods::ethui::ListWallets);
        local_method!("ethui_createWallet", methods::ethui::CreateWallet, redact);
        local_method!("ethui_setCurrentWallet", methods::ethui::SetCurrentWallet);
        local_method!("ethui_setCurrentPath", methods::ethui::SetCurrentPath);
        local_method!("ethui_setCurrentNetwork", methods::ethui::SetCurrentNetwork);
        local_method!("ethui_setFastMode", methods::ethui::SetFastMode);

        // Registered last so the captured list covers every handler above.
        // `self_handler!` can't express this: its closures are 'static and have
        // no access to `self.io` to read the registry back out.
        let mut names: Vec<String> = self.method_names().map(String::from).collect();
        names.push("ethui_rpcMethods".to_string());
        names.sort();

        // An origin must not learn the local tier exists by reading it off the
        // discovery method, which would defeat the method-not-found in
        // `local_method!`.
        let local_names = self.local_names.clone();
        let origin_names: Vec<String> = names
            .iter()
            .filter(|name| !local_names.contains(name))
            .cloned()
            .collect();

        // Both rendered once at registration rather than per call: neither
        // changes for the life of the handler, only which one a caller gets.
        let local_payload = json!(names);
        let origin_payload = json!(origin_names);

        self.io
            .add_method_with_meta("ethui_rpcMethods", move |_: Params, ctx: Ctx| {
                let payload = if ctx.trust == Trust::Local {
                    local_payload.clone()
                } else {
                    origin_payload.clone()
                };
                async move { Ok::<Json, jsonrpc_core::Error>(payload) }
            });
    }

    async fn accounts(_: Empty, _: Ctx) -> Result<Json> {
        let wallets = Wallets::read().await;
        let address = wallets.get_current_wallet().get_current_address().await;

        Ok(json!([address]))
    }

    async fn chain_id(_: Empty, ctx: Ctx) -> Result<Json> {
        let network = ctx.network().await;
        Ok(json!(network.chain_id_hex()))
    }

    async fn metamask_provider_state(_: Empty, ctx: Ctx) -> Result<Json> {
        let wallets = Wallets::read().await;

        let network = ctx.network().await;
        let address = wallets.get_current_wallet().get_current_address().await;

        Ok(json!({
            "isUnlocked": true,
            "chainId": network.chain_id_hex(),
            "networkVersion": network.chain_id().to_string(),
            "accounts": [address],
        }))
    }

    #[tracing::instrument(skip(request))]
    async fn request_permissions(request: PermissionRequestParams, mut ctx: Ctx) -> Result<Json> {
        let ret = ctx.request_permissions(request.into());

        Ok(json!(ret))
    }

    #[tracing::instrument(skip(request))]
    async fn revoke_permissions(request: PermissionRequestParams, mut ctx: Ctx) -> Result<Json> {
        let ret = ctx.revoke_permissions(request.into());

        Ok(json!(ret))
    }

    #[tracing::instrument(skip(_params, ctx))]
    async fn get_permissions(_params: Empty, ctx: Ctx) -> Result<Json> {
        Ok(json!(ctx.get_permissions()))
    }

    #[tracing::instrument()]
    async fn switch_chain(params: SwitchChainParams, mut ctx: Ctx) -> Result<Json> {
        let new_chain_id = params.chain_id()?;

        // TODO future work
        // multiple networks with same chain id should display a dialog so user can select which
        // network to switch to
        ctx.switch_chain(new_chain_id).await.map_err(Error::Ethui)?;

        Ok(Json::Null)
    }

    async fn unimplemented(_: Empty, _: Ctx) -> Result<Json> {
        tracing::warn!("unimplemented method called");

        Err(Error::JsonRpc(jsonrpc_core::Error::internal_error()))
    }

    async fn ethui_provider_state(_: Empty, ctx: Ctx) -> Result<Json> {
        let wallets = Wallets::read().await;

        let network = ctx.network().await;
        let address = wallets.get_current_wallet().get_current_address().await;

        Ok(json!({
            "ethui": {
                "version": env!("CARGO_PKG_VERSION"),
            },
            "network": {
                "chainId": network.chain_id_hex(),
            },
            "accounts": [address],
        }))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Dispatch `method` through `handler` and return the raw JSON-RPC output,
    /// so tests can assert on error codes rather than on `Result` shape.
    async fn call(handler: &Handler, method: &str, params: Params) -> jsonrpc_core::Output {
        let response = handler
            .handle(jsonrpc_core::Request::Single(
                jsonrpc_core::Call::MethodCall(jsonrpc_core::MethodCall {
                    jsonrpc: Some(jsonrpc_core::Version::V2),
                    method: method.to_owned(),
                    params,
                    id: jsonrpc_core::Id::Num(1),
                }),
            ))
            .await
            .expect("a method call must produce a response");

        match response {
            jsonrpc_core::Response::Single(output) => output,
            other => panic!("expected a single response, got {other:?}"),
        }
    }

    fn error_code(output: &jsonrpc_core::Output) -> jsonrpc_core::ErrorCode {
        match output {
            jsonrpc_core::Output::Failure(failure) => failure.error.code.clone(),
            jsonrpc_core::Output::Success(success) => {
                panic!("expected a failure, got {:?}", success.result)
            }
        }
    }

    /// Params that reach the method but fail to deserialize, so the call proves
    /// it got *past* the trust gate without needing the actors a real call hits.
    fn malformed() -> Params {
        Params::Array(vec![json!({})])
    }

    #[tokio::test]
    async fn a_local_caller_reaches_a_local_method() {
        let handler = Handler::new(None, Trust::Local);

        let output = call(&handler, "ethui_setFastMode", malformed()).await;

        assert_ne!(
            error_code(&output),
            jsonrpc_core::ErrorCode::MethodNotFound,
            "a Local caller must see local methods; got {output:?}"
        );
    }

    #[test]
    fn method_names_includes_rpc_methods_itself() {
        let handler = Handler::new(None, Trust::Local);
        let names: Vec<&str> = handler.method_names().collect();

        assert!(
            names.contains(&"ethui_rpcMethods"),
            "ethui_rpcMethods must be registered; got {names:?}"
        );
    }

    #[test]
    fn method_names_includes_known_handlers() {
        let handler = Handler::new(None, Trust::Local);
        let names: Vec<&str> = handler.method_names().collect();

        for expected in [
            "eth_accounts",
            "eth_chainId",
            "eth_getLogs",
            "eth_sendTransaction",
            "eth_gasPrice",
            "ethui_getContractAbi",
        ] {
            assert!(names.contains(&expected), "missing {expected}");
        }
    }

    /// The list is captured at registration time, so it can only be trusted if
    /// what the handler *serves* is checked, not just that it is registered.
    /// Moving the capture above a handler would silently drop entries from the
    /// served list while every `method_names()` assertion above still passed.
    #[tokio::test]
    async fn rpc_methods_serves_the_whole_registry() {
        let handler = Handler::new(None, Trust::Local);

        let response = handler
            .handle(jsonrpc_core::Request::Single(
                jsonrpc_core::Call::MethodCall(jsonrpc_core::MethodCall {
                    jsonrpc: Some(jsonrpc_core::Version::V2),
                    method: "ethui_rpcMethods".to_owned(),
                    params: Params::Array(vec![]),
                    id: jsonrpc_core::Id::Num(1),
                }),
            ))
            .await
            .expect("ethui_rpcMethods must answer");

        let jsonrpc_core::Response::Single(jsonrpc_core::Output::Success(success)) = response
        else {
            panic!("expected a success response, got {response:?}");
        };

        let mut served: Vec<String> = serde_json::from_value(success.result).unwrap();
        let mut registered: Vec<String> = handler.method_names().map(String::from).collect();
        served.sort();
        registered.sort();

        assert_eq!(served, registered);
    }

    #[tokio::test]
    async fn an_origin_caller_cannot_reach_a_local_method() {
        let handler = Handler::new(Some("evil.example".into()), Trust::Origin);

        let output = call(&handler, "ethui_setFastMode", malformed()).await;

        assert_eq!(
            error_code(&output),
            jsonrpc_core::ErrorCode::MethodNotFound,
            "an Origin caller must not reach the local tier; got {output:?}"
        );
    }

    /// Method-not-found is pointless if the discovery method hands an origin
    /// the same names anyway.
    #[tokio::test]
    async fn rpc_methods_hides_the_local_tier_from_an_origin() {
        let handler = Handler::new(Some("evil.example".into()), Trust::Origin);

        let output = call(&handler, "ethui_rpcMethods", Params::Array(vec![])).await;

        let jsonrpc_core::Output::Success(success) = output else {
            panic!("ethui_rpcMethods must answer an origin, got {output:?}");
        };
        let served: Vec<String> = serde_json::from_value(success.result).unwrap();

        assert!(
            !served.contains(&"ethui_setFastMode".to_string()),
            "the local tier must not appear in an origin's registry; got {served:?}"
        );
        assert!(
            served.contains(&"eth_accounts".to_string()),
            "an origin must still see the ordinary methods; got {served:?}"
        );
    }

    /// What WalletConnect advertises to a dApp comes from here, so a local
    /// method leaking into it would be claimed as supported to remote peers.
    #[test]
    fn served_method_names_drops_the_local_tier_for_an_origin() {
        let local = Handler::new(None, Trust::Local);
        let origin = Handler::new(Some("evil.example".into()), Trust::Origin);

        let local_served: Vec<&str> = local.served_method_names().collect();
        let origin_served: Vec<&str> = origin.served_method_names().collect();

        assert!(local_served.contains(&"ethui_setFastMode"));
        assert!(!origin_served.contains(&"ethui_setFastMode"));
    }
}
