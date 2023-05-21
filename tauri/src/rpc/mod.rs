mod send_transaction;

use std::{collections::HashMap, str::FromStr};

use ethers::abi::AbiEncode;
use ethers::{
    prelude::SignerMiddleware,
    providers::{Middleware, ProviderError},
    signers::Signer,
    types::{transaction::eip712, Address, Bytes},
};
use jsonrpc_core::{ErrorCode, MetaIoHandler, Params};
use serde_json::json;

use self::send_transaction::SendTransaction;
use crate::wallets::Wallets;
use crate::{context::Context, networks::Networks, types::GlobalState};

pub struct Handler {
    io: MetaIoHandler<Context>,
}

impl jsonrpc_core::Metadata for Context {}

type Result<T> = jsonrpc_core::Result<T>;

impl Default for Handler {
    fn default() -> Self {
        let mut res = Self {
            io: MetaIoHandler::default(),
        };
        res.add_handlers();
        res
    }
}

fn ethers_to_jsonrpc_error(e: ProviderError) -> jsonrpc_core::Error {
    // TODO: probable handle more error types here
    match e {
        ProviderError::JsonRpcClientError(e) => {
            if let Some(e) = e.as_error_response() {
                jsonrpc_core::Error {
                    code: ErrorCode::ServerError(e.code),
                    data: e.data.clone(),
                    message: e.message.clone(),
                }
            } else if e.as_serde_error().is_some() {
                jsonrpc_core::Error::invalid_request()
            } else {
                jsonrpc_core::Error::internal_error()
            }
        }
        _ => jsonrpc_core::Error::internal_error(),
    }
}

impl Handler {
    pub async fn handle(&self, request: String, ctx: Context) -> Option<String> {
        self.io.handle_request(&request, ctx).await
    }

    fn add_handlers(&mut self) {
        macro_rules! self_handler {
            ($name:literal, $fn:path) => {
                self.io
                    .add_method_with_meta($name, |params: Params, ctx: Context| async move {
                        $fn(params, ctx).await
                    });
            };
        }

        macro_rules! provider_handler {
            ($name:literal) => {
                self.io
                    .add_method_with_meta($name, |params: Params, _ctx: Context| async move {
                        let provider = Networks::read().await.get_current_provider();

                        let res: jsonrpc_core::Result<serde_json::Value> = provider
                            .request::<_, serde_json::Value>($name, params)
                            .await
                            .map_err(ethers_to_jsonrpc_error);
                        res
                    });
            };
        }

        // delegate directly to provider
        provider_handler!("eth_estimateGas");
        provider_handler!("eth_call");
        provider_handler!("eth_blockNumber");
        provider_handler!("net_version");

        // handle internally
        self_handler!("eth_accounts", Self::accounts);
        self_handler!("eth_requestAccounts", Self::accounts);
        self_handler!("eth_chainId", Self::chain_id);
        self_handler!("eth_sendTransaction", Self::send_transaction);
        self_handler!("eth_sign", Self::eth_sign);

        self_handler!("personal_sign", Self::eth_sign);
        self_handler!("metamask_getProviderState", Self::provider_state);

        self_handler!("wallet_switchEthereumChain", Self::switch_chain);

        self_handler!("eth_signTypedData", Self::eth_sign_typed_data_v4);
        self_handler!("eth_signTypedData_v4", Self::eth_sign_typed_data_v4);
    }

    async fn accounts(_: Params, _ctx: Context) -> Result<serde_json::Value> {
        let wallets = Wallets::read().await;

        Ok(json!([wallets.wallet.checksummed_address()]))
    }

    async fn chain_id(_: Params, _ctx: Context) -> Result<serde_json::Value> {
        let networks = Networks::read().await;
        let network = networks.get_current_network();
        Ok(json!(network.chain_id_hex()))
    }

    async fn provider_state(_: Params, _ctx: Context) -> Result<serde_json::Value> {
        let networks = Networks::read().await;
        let wallets = Wallets::read().await;

        let network = networks.get_current_network();

        Ok(json!({
            "isUnlocked": true,
            "chainId": network.chain_id_hex(),
            "networkVersion": network.name,
            "accounts": [wallets.wallet.checksummed_address()],
        }))
    }

    async fn switch_chain(params: Params, _ctx: Context) -> Result<serde_json::Value> {
        let params = params.parse::<Vec<HashMap<String, String>>>().unwrap();
        let chain_id_str = params[0].get("chainId").unwrap().clone();
        let chain_id = u32::from_str_radix(&chain_id_str[2..], 16).unwrap();

        let mut networks = Networks::write().await;
        match networks.set_current_network_by_id(chain_id) {
            Ok(_) => Ok(serde_json::Value::Null),
            Err(e) => Err(jsonrpc_core::Error::invalid_params(e.to_string())),
        }
    }

    async fn send_transaction(params: Params, _ctx: Context) -> Result<serde_json::Value> {
        #[cfg(feature = "dialogs")]
        {
            // TODO: why is this an array?
            let params: serde_json::Value = params.clone().into();
            let params = params.as_array().unwrap()[0].clone();

            let rcv = crate::dialogs::open("tx-review", params).unwrap();
            match rcv.await {
                // 1st case is if the channel closes. 2nd case is if "Reject" is hit
                Err(_) | Ok(Err(_)) => {
                    // TODO: what's the appropriate error to return here?
                    // or should we return Ok(_)? Err(_) seems to close the ws connection
                    return Err(jsonrpc_core::Error {
                        code: ErrorCode::ServerError(0),
                        data: None,
                        message: "transaction rejected".into(),
                    });
                }
                Ok(Ok(_response)) => {
                    // TODO: in the future, send json values here to override params
                }
            }
        }

        let mut sender = SendTransaction::build(params.into());

        let networks = Networks::read().await;
        let network = networks.get_current_network();

        let wallets = Wallets::read().await;

        // create signer
        let signer = SignerMiddleware::new(network.get_provider(), wallets.get_signer());

        sender.set_chain_id(network.chain_id);
        sender.set_signer(signer);
        sender.estimate_gas().await;

        let res = sender.send().await;

        match res {
            Ok(res) => Ok(res.tx_hash().encode_hex().into()),
            Err(e) => Ok(e.to_string().into()),
        }
    }

    async fn eth_sign(params: Params, _ctx: Context) -> Result<serde_json::Value> {
        let params = params.parse::<Vec<Option<String>>>().unwrap();
        let msg = params[0].as_ref().cloned().unwrap();
        let address = Address::from_str(&params[1].as_ref().cloned().unwrap()).unwrap();

        // TODO: ensure from == signer

        let wallets = Wallets::read().await;
        let provider = Networks::read().await.get_current_provider();
        let signer = SignerMiddleware::new(provider, wallets.get_signer());

        let bytes = Bytes::from_str(&msg).unwrap();
        let res = signer.sign(bytes, &address).await;

        match res {
            Ok(res) => Ok(format!("0x{}", res).into()),
            Err(e) => Ok(e.to_string().into()),
        }
    }

    async fn eth_sign_typed_data_v4(params: Params, _ctx: Context) -> Result<serde_json::Value> {
        let params = params.parse::<Vec<Option<String>>>().unwrap();
        let _address = Address::from_str(&params[0].as_ref().cloned().unwrap()).unwrap();
        let data = params[1].as_ref().cloned().unwrap();
        let typed_data: eip712::TypedData = serde_json::from_str(&data).unwrap();

        let wallets = Wallets::read().await;
        let signer = wallets.get_signer();
        // TODO: ensure from == signer

        let res = signer.sign_typed_data(&typed_data).await;

        match res {
            Ok(res) => Ok(format!("0x{}", res).into()),
            Err(e) => Ok(e.to_string().into()),
        }
    }
}
