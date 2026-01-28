pub mod commands;
mod error;
mod methods;
mod params;
mod utils;

use alloy::providers::Provider as _;
use ethui_connections::Ctx;
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
}

impl Handler {
    pub fn new(domain: Option<String>) -> Self {
        let mut res = Self {
            io: MetaIoHandler::default(),
            ctx: Ctx {
                domain,
                ..Default::default()
            },
        };
        res.add_handlers();
        res
    }

    pub async fn handle(&self, request: jsonrpc_core::Request) -> Option<jsonrpc_core::Response> {
        self.io.handle_rpc_request(request, self.ctx.clone()).await
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
    async fn request_permissions(
        request: PermissionRequestParams,
        mut ctx: Ctx,
    ) -> Result<Json> {
        let ret = ctx.request_permissions(request.into());

        Ok(json!(ret))
    }

    #[tracing::instrument(skip(request))]
    async fn revoke_permissions(
        request: PermissionRequestParams,
        mut ctx: Ctx,
    ) -> Result<Json> {
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
