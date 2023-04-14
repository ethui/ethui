use std::{collections::HashMap, str::FromStr};

use ethers::abi::AbiEncode;
use ethers::signers::Signer;
use ethers::types::transaction::eip712;
use ethers::{
    prelude::SignerMiddleware,
    providers::Middleware,
    types::{
        serde_helpers::StringifiedNumeric, transaction::eip2718::TypedTransaction, Address, Bytes,
        Eip1559TransactionRequest, U256,
    },
};
use jsonrpc_core::{MetaIoHandler, Params};
use log::debug;
use serde_json::json;

use crate::context::{Context, UnlockedContext};

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

impl Handler {
    pub async fn handle(&self, request: String, ctx: Context) -> Option<String> {
        self.io.handle_request(&request, ctx).await
    }

    fn add_handlers(&mut self) {
        macro_rules! self_handler {
            ($name:literal, $fn:path) => {
                self.io
                    .add_method_with_meta($name, |params: Params, ctx: Context| async move {
                        let ctx = ctx.lock().await;
                        $fn(params, ctx).await
                    });
            };
        }

        macro_rules! provider_handler {
            ($name:literal) => {
                self.io
                    .add_method_with_meta($name, |params: Params, ctx: Context| async move {
                        let provider = ctx.lock().await.get_provider();
                        let res: serde_json::Value = provider
                            .request::<_, serde_json::Value>($name, params)
                            .await
                            .unwrap();
                        Ok(res)
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

    async fn accounts(_: Params, ctx: UnlockedContext<'_>) -> Result<serde_json::Value> {
        Ok(json!([ctx.wallet.checksummed_address()]))
    }

    async fn chain_id(_: Params, ctx: UnlockedContext<'_>) -> Result<serde_json::Value> {
        Ok(json!(ctx.get_current_network().chain_id_hex()))
    }

    async fn provider_state(_: Params, ctx: UnlockedContext<'_>) -> Result<serde_json::Value> {
        let network = ctx.get_current_network();

        Ok(json!({
            "isUnlocked": true,
            "chainId": network.chain_id_hex(),
            "networkVersion": network.name,
            "accounts": [ctx.wallet.checksummed_address()],
        }))
    }

    async fn switch_chain(
        params: Params,
        mut ctx: UnlockedContext<'_>,
    ) -> Result<serde_json::Value> {
        let params = params.parse::<Vec<HashMap<String, String>>>().unwrap();
        let chain_id_str = params[0].get("chainId").unwrap().clone();
        let chain_id = u32::from_str_radix(&chain_id_str[2..], 16).unwrap();

        match ctx.set_current_network_by_id(chain_id) {
            Ok(_) => Ok(serde_json::Value::Null),
            Err(e) => Err(jsonrpc_core::Error::invalid_params(e)),
        }
    }

    async fn send_transaction(
        params: Params,
        ctx: UnlockedContext<'_>,
    ) -> Result<serde_json::Value> {
        let params = params.parse::<Vec<HashMap<String, String>>>().unwrap()[0].clone();

        // parse params
        let from = Address::from_str(params.get("from").unwrap()).unwrap();
        let to = Address::from_str(params.get("to").unwrap()).unwrap();
        let value = params
            .get("value")
            .cloned()
            .map(|v| U256::try_from(StringifiedNumeric::String(v)).unwrap())
            .unwrap_or_else(U256::default);
        let data = params.get("data");
        let chain_id = ctx.get_current_network().chain_id;

        // TODO: ensure from == signer

        // construct an EIP1559 tx, and wrap in Eip2718
        let mut tx = Eip1559TransactionRequest::new()
            .to(to)
            .from(from)
            .value(value)
            .chain_id(chain_id);

        if let Some(data) = data {
            tx = tx.data(Bytes::from_str(data).unwrap());
        }

        let mut envelope = TypedTransaction::Eip1559(tx);

        // create signer
        let provider = ctx.get_provider();
        let signer = SignerMiddleware::new(provider, ctx.get_signer());

        // fill in gas
        // TODO: we're defaulting to 1_000_000 gas cost if estimation fails
        // estimation failing means the tx will faill anyway, so this is fine'ish
        // but can probably be improved a lot in the future
        let gas_limit = signer
            .estimate_gas(&envelope, None)
            .await
            .unwrap_or(1_000_000.into());

        envelope.set_gas(gas_limit * 120 / 100);

        // sign & send
        let res = signer.send_transaction(envelope, None).await;

        match res {
            Ok(res) => Ok(res.tx_hash().encode_hex().into()),
            Err(e) => Ok(e.to_string().into()),
        }
    }

    async fn eth_sign(params: Params, ctx: UnlockedContext<'_>) -> Result<serde_json::Value> {
        let params = params.parse::<Vec<Option<String>>>().unwrap();
        let msg = params[0].as_ref().cloned().unwrap();
        let address = Address::from_str(&params[1].as_ref().cloned().unwrap()).unwrap();

        // TODO: ensure from == signer

        let provider = ctx.get_provider();
        let signer = SignerMiddleware::new(provider, ctx.get_signer());

        let bytes = Bytes::from_str(&msg).unwrap();
        let res = signer.sign(bytes, &address).await;

        match res {
            Ok(res) => Ok(format!("0x{}", res).into()),
            Err(e) => Ok(e.to_string().into()),
        }
    }

    async fn eth_sign_typed_data_v4(
        params: Params,
        ctx: UnlockedContext<'_>,
    ) -> Result<serde_json::Value> {
        let params = params.parse::<Vec<Option<String>>>().unwrap();
        let _address = Address::from_str(&params[0].as_ref().cloned().unwrap()).unwrap();
        let data = params[1].as_ref().cloned().unwrap();
        let typed_data: eip712::TypedData = serde_json::from_str(&data).unwrap();

        let signer = ctx.get_signer();
        // TODO: ensure from == signer

        let res = signer.sign_typed_data(&typed_data).await;

        match res {
            Ok(res) => Ok(format!("0x{}", res).into()),
            Err(e) => Ok(e.to_string().into()),
        }
    }
}
