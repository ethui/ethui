pub mod commands;
mod error;
mod methods;
pub mod utils;

use alloy::{dyn_abi::TypedData, hex, providers::Provider as _};
use ethui_connections::{Ctx, permissions::PermissionRequest};
use ethui_types::prelude::*;
use ethui_wallets::{WalletControl, Wallets};
use jsonrpc_core::{MetaIoHandler, Params};
use serde_json::json;

pub use self::error::{Error, Result};

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
            ($name:literal, $fn:path) => {
                self.io
                    .add_method_with_meta($name, |params: Params, ctx: Ctx| async move {
                        info!(method = $name, params = serde_json::to_string(&params).unwrap());
                        let ret: Result<Json> = $fn(params, ctx).await;
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
        self_handler!("eth_sendTransaction", Self::send_transaction);
        self_handler!("eth_sign", Self::eth_sign);
        self_handler!("personal_sign", Self::eth_sign);
        self_handler!("eth_signTypedData", Self::eth_sign_typed_data_v4);
        self_handler!("eth_signTypedData_v4", Self::eth_sign_typed_data_v4);
        self_handler!("wallet_requestPermissions", Self::request_permissions);
        self_handler!("wallet_revokePermissions", Self::revoke_permissions);
        self_handler!("wallet_getPermissions", Self::get_permissions);
        self_handler!("wallet_addEthereumChain", Self::add_chain);
        self_handler!("wallet_updateEthereumChain", Self::update_chain);
        self_handler!("wallet_switchEthereumChain", Self::switch_chain);
        self_handler!("wallet_watchAsset", Self::add_token);

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
        self_handler!("ethui_getContractAbi", Self::ethui_get_abi_for_contract);
        self_handler!("ethui_getAddressAlias", Self::ethui_get_address_alias);

        #[cfg(feature = "forge-traces")]
        self_handler!(
            "ethui_forgeTestSubmitRun",
            Self::ethui_forge_test_submit_run
        );
    }

    async fn accounts(_: Params, _: Ctx) -> Result<Json> {
        let wallets = Wallets::read().await;
        let address = wallets.get_current_wallet().get_current_address().await;

        Ok(json!([address]))
    }

    async fn chain_id(_: Params, ctx: Ctx) -> Result<Json> {
        let network = ctx.network().await;
        Ok(json!(network.chain_id_hex()))
    }

    async fn metamask_provider_state(_: Params, ctx: Ctx) -> Result<Json> {
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

    #[tracing::instrument(skip(params))]
    async fn request_permissions(params: Params, mut ctx: Ctx) -> Result<Json> {
        let request = params.parse::<PermissionRequest>().unwrap();
        let ret = ctx.request_permissions(request);

        Ok(json!(ret))
    }

    #[tracing::instrument(skip(params))]
    async fn revoke_permissions(params: Params, mut ctx: Ctx) -> Result<Json> {
        let request = params.parse::<PermissionRequest>().unwrap();
        let ret = ctx.revoke_permissions(request);

        Ok(json!(ret))
    }

    #[tracing::instrument(skip(_params, ctx))]
    async fn get_permissions(_params: Params, ctx: Ctx) -> Result<Json> {
        Ok(json!(ctx.get_permissions()))
    }

    #[tracing::instrument(skip(params, _ctx))]
    async fn add_chain(params: Params, _ctx: Ctx) -> Result<Json> {
        let method = methods::ChainAdd::build()
            .set_params(params.into())?
            .build()
            .await;

        method.run().await?;

        Ok(Json::Null)
    }

    #[tracing::instrument(skip(_ctx))]
    async fn update_chain(params: Params, _ctx: Ctx) -> Result<Json> {
        let method = methods::ChainUpdate::build()
            .set_params(params.into())?
            .build()
            .await;

        method.run().await?;

        Ok(true.into())
    }

    #[tracing::instrument()]
    async fn switch_chain(params: Params, mut ctx: Ctx) -> Result<Json> {
        let params = params.parse::<Vec<HashMap<String, String>>>().unwrap();
        let chain_id_str = params[0].get("chainId").unwrap().clone();
        let new_chain_id = u32::from_str_radix(&chain_id_str[2..], 16).unwrap();

        // TODO future work
        // multiple networks with same chain id should display a dialog so user can select which
        // network to switch to
        ctx.switch_chain(new_chain_id).await?;

        Ok(Json::Null)
    }

    #[tracing::instrument(skip(params, _ctx))]
    async fn add_token(params: Params, _ctx: Ctx) -> Result<Json> {
        let method = methods::TokenAdd::build()
            .set_params(params.into())?
            .build()
            .await?;

        method.run().await?;

        Ok(true.into())
    }

    async fn send_transaction<T: Into<Json>>(params: T, ctx: Ctx) -> Result<Json> {
        // TODO: check that requested wallet is authorized
        let mut sender = methods::SendTransaction::build(&ctx)
            .set_request(params.into())
            .await
            .unwrap()
            .build()
            .await;

        let result = sender.estimate_gas().await.finish().await?;

        Ok(format!("0x{:x}", result.tx_hash()).into())
    }

    async fn send_call(params: Json, ctx: Ctx) -> Result<Bytes> {
        let mut sender = methods::SendCall::build(&ctx)
            .set_request(params)
            .await
            .unwrap()
            .build()
            .await;

        sender.finish().await
    }

    async fn eth_sign(params: Params, ctx: Ctx) -> Result<Json> {
        let params = params.parse::<Vec<Option<String>>>().unwrap();
        let msg = params[0].as_ref().cloned().unwrap();
        // TODO where should this be used?
        // let address = Address::from_str(&params[1].as_ref().cloned().unwrap()).unwrap();

        let wallet = ethui_wallets::get_current_wallet().await;
        let wallet_path = wallet.get_current_path();
        let network = ctx.network().await;

        let mut signer = methods::SignMessage::build()
            .set_wallet(wallet)
            .set_wallet_path(wallet_path)
            .set_network(network)
            .set_string_data(msg)
            .build();

        // TODO: ensure from == signer

        let result = signer.finish().await?;

        Ok(format!("0x{}", hex::encode(result.as_bytes())).into())
    }

    async fn eth_sign_typed_data_v4(params: Params, ctx: Ctx) -> Result<Json> {
        let params = params.parse::<Vec<Option<String>>>().unwrap();
        // TODO where should this be used?
        // let address = Address::from_str(&params[0].as_ref().cloned().unwrap()).unwrap();
        let data = params[1].as_ref().cloned().unwrap();
        let typed_data: TypedData = serde_json::from_str(&data).unwrap();

        let wallet = ethui_wallets::get_current_wallet().await;
        let wallet_path = wallet.get_current_path();
        let network = ctx.network().await;

        let mut signer = methods::SignMessage::build()
            .set_wallet(wallet)
            .set_wallet_path(wallet_path)
            .set_network(network)
            .set_typed_data(typed_data)
            .build();

        let result = signer.finish().await?;

        Ok(format!("0x{}", hex::encode(result.as_bytes())).into())
    }

    async fn unimplemented(params: Params, _: Ctx) -> Result<Json> {
        tracing::warn!("unimplemented method called: {:?}", params);

        Err(Error::JsonRpc(jsonrpc_core::Error::internal_error()))
    }

    async fn ethui_provider_state(_: Params, ctx: Ctx) -> Result<Json> {
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

    async fn ethui_get_abi_for_contract(params: Params, ctx: Ctx) -> Result<Json> {
        let network = ctx.network().await;

        let method = methods::ethui::AbiForContract::build()
            .set_network(network)
            .set_params(params.into())
            .build()?;

        method.run().await
    }

    async fn ethui_get_address_alias(params: Params, _ctx: Ctx) -> Result<Json> {
        let method = methods::ethui::AddressAlias::build()
            .set_params(params.into())
            .build()?;

        method.run().await
    }

    #[cfg(feature = "forge-traces")]
    async fn ethui_forge_test_submit_run(params: Params, _ctx: Ctx) -> Result<Json> {
        let method = methods::ethui::ForgeTestTraces::build()
            .set_params(params.into())
            .build()?;

        Ok(method.run().await?)
    }
}
