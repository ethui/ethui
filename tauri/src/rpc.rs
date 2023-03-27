use std::collections::HashMap;

use ethers::providers::{Http, Provider};
use jsonrpc_core::{MetaIoHandler, Params};
use log::debug;
use serde_json::json;

use crate::context::{Context, UnlockedContext};

pub struct Handler {
    io: MetaIoHandler<Context>,
}

impl jsonrpc_core::Metadata for Context {}

impl Default for Handler {
    fn default() -> Self {
        let mut res = Self {
            io: MetaIoHandler::default(),
        };
        res.add_handlers();
        res
    }
}

impl Handler {
    pub async fn handle(&self, request: String, ctx: Context) -> Option<String> {
        self.io.handle_request(&request.to_string(), ctx).await
    }

    fn add_handlers(&mut self) {
        macro_rules! self_handler {
            ($name:literal, $fn:path) => {
                self.io
                    .add_method_with_meta($name, |params: Params, ctx: Context| async move {
                        let ctx = ctx.lock().await;
                        let res = $fn(params, ctx).await;
                        dbg!("self RPC {}: {:?}", $name, &res);
                        Ok(res)
                    });
            };
        }

        macro_rules! provider_handler {
            ($name:literal) => {
                self.io
                    .add_method_with_meta($name, |params: Params, ctx: Context| async move {
                        let ctx = ctx.lock().await;
                        let network = ctx.get_current_network();
                        let provider = Provider::<Http>::try_from(network.rpc_url).unwrap();
                        let res: serde_json::Value = provider
                            .request::<_, serde_json::Value>($name, params)
                            .await
                            .unwrap();
                        debug!("provider RPC {}: {}", $name, res);
                        Ok(res)
                    });
            };
        }

        self_handler!("eth_accounts", Self::accounts);
        self_handler!("eth_requestAccounts", Self::accounts);
        self_handler!("eth_chainId", Self::chain_id);
        self_handler!("metamask_getProviderState", Self::provider_state);
        self_handler!("wallet_switchEthereumChain", Self::switch_chain);
        provider_handler!("eth_estimateGas");
        provider_handler!("eth_call");
    }

    async fn accounts(_: Params, ctx: UnlockedContext<'_>) -> serde_json::Value {
        json!([ctx.wallet.checksummed_address()])
    }

    async fn chain_id(_: Params, ctx: UnlockedContext<'_>) -> serde_json::Value {
        json!(ctx.get_current_network().chain_id_hex())
    }

    async fn provider_state(_: Params, ctx: UnlockedContext<'_>) -> serde_json::Value {
        let network = ctx.get_current_network();

        json!({
            "isUnlocked": true,
            "chainId": network.chain_id_hex(),
            "networkVersion": network.name,
            "accounts": [ctx.wallet.checksummed_address()],
        })
    }

    async fn switch_chain(params: Params, mut ctx: UnlockedContext<'_>) -> serde_json::Value {
        let params = params.parse::<Vec<HashMap<String, String>>>().unwrap();
        let chain_id_str = params[0].get("chainId").unwrap().clone();
        let chain_id = u32::from_str_radix(&chain_id_str[2..], 16).unwrap();

        ctx.set_current_network_by_id(chain_id);

        serde_json::Value::Null
    }
}
