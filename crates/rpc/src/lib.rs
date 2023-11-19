pub mod commands;
mod error;
mod send_transaction;
mod sign_message;

use std::collections::HashMap;
use std::sync::Arc;

use ethers::{abi::AbiEncode, types::transaction::eip712};
use iron_connections::Ctx;
use iron_types::GlobalState;
use iron_wallets::{WalletControl, Wallets};
use jsonrpsee::types::Params;
use jsonrpsee::{MethodResponse, RpcModule};
use serde_json::json;
use tokio::sync::{Mutex, MutexGuard};

pub use self::error::{Error, Result};
use self::sign_message::SignMessage;

pub struct Handler {
    rpc: RpcModule<Mutex<Ctx>>,
}

impl Handler {
    pub fn new(domain: Option<String>) -> Result<Self> {
        let ctx = Mutex::new(Ctx { domain });
        let mut res = Self {
            rpc: RpcModule::new(ctx),
        };
        res.add_handlers()?;
        Ok(res)
    }

    pub async fn handle_raw(&self, raw: &str) -> Result<MethodResponse> {
        let (rx, _) = self.rpc.raw_json_request(raw, 1).await?;
        Ok(rx)
    }

    // pub async fn handle(
    //     &self,
    //     method: &str,
    //     params: serde_json::value::RawValue,
    // ) -> Result<MethodResponse> {
    //     Ok(self.rpc.call(method, params).await?)
    //     // self.io.handle_rpc_request(request, self.ctx.clone()).await
    // }

    fn add_handlers(&mut self) -> Result<()> {
        macro_rules! self_handler {
            ($name:literal, $fn:path) => {
                self.rpc.register_async_method(
                    $name,
                    |params: Params<'static>, ctx: Arc<Mutex<Ctx>>| async move {
                        $fn(params, ctx.lock().await)
                            .await
                            .map_err(error::to_jsonrpsee_error)
                    },
                )?;
            };
        }

        macro_rules! provider_handler {
            ($name:literal) => {
                self.rpc.register_async_method(
                    $name,
                    |params: Params<'static>, ctx: Arc<Mutex<Ctx>>| async move {
                        tracing::debug!("{} {:?}", $name, params);

                        let provider = {
                            let ctx = ctx.lock().await;
                            ctx.network().await.get_provider()
                        };

                        provider
                            .request::<_, serde_json::Value>(
                                $name,
                                params.parse::<serde_json::Value>().unwrap(),
                            )
                            .await
                            .map_err(error::ethers_to_jsonrpsee_error)
                    },
                )?;
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
        self_handler!("wallet_switchEthereumChain", Self::switch_chain);

        // metamask
        self_handler!("metamask_getProviderState", Self::provider_state);

        // not yet implemented
        // TODO:
        // self_handler!("web3_clientVersion", Self::unimplemented);
        // self_handler!("web3_sha3", Self::unimplemented);
        // self_handler!("net_listening", Self::unimplemented);
        // self_handler!("net_peerCount", Self::unimplemented);
        // self_handler!("eth_gasPrice", Self::unimplemented);
        // self_handler!("eth_signTransaction", Self::unimplemented);

        Ok(())
    }

    async fn accounts(_: Params<'_>, _: MutexGuard<'_, Ctx>) -> Result<serde_json::Value> {
        let wallets = Wallets::read().await;
        let address = wallets.get_current_wallet().get_current_address().await;

        Ok(json!([address]))
    }

    async fn chain_id(_: Params<'_>, ctx: MutexGuard<'_, Ctx>) -> Result<serde_json::Value> {
        let network = ctx.network().await;
        Ok(json!(network.chain_id_hex()))
    }

    async fn provider_state(_: Params<'_>, ctx: MutexGuard<'_, Ctx>) -> Result<serde_json::Value> {
        let wallets = Wallets::read().await;

        let network = ctx.network().await;
        let address = wallets.get_current_wallet().get_current_address().await;

        Ok(json!({
            "isUnlocked": true,
            "chainId": network.chain_id_hex(),
            "networkVersion": network.chain_id.to_string(),
            "accounts": [address],
        }))
    }

    #[tracing::instrument()]
    async fn switch_chain(
        params: Params<'_>,
        mut ctx: MutexGuard<'_, Ctx>,
    ) -> Result<serde_json::Value> {
        let params = params.parse::<Vec<HashMap<String, String>>>().unwrap();
        let chain_id_str = params[0].get("chainId").unwrap().clone();
        let new_chain_id = u32::from_str_radix(&chain_id_str[2..], 16).unwrap();

        ctx.switch_chain(new_chain_id)
            .await
            .map(|_| serde_json::Value::Null)
            .map_err(Error::Connection)
    }

    async fn send_transaction(
        params: Params<'_>,
        ctx: MutexGuard<'_, Ctx>,
    ) -> Result<serde_json::Value> {
        use send_transaction::SendTransaction;

        // TODO: check that requested wallet is authorized
        let mut sender = SendTransaction::build(&ctx)
            .set_request(params.parse()?)
            .await
            .unwrap()
            .build()
            .await;

        let result = sender.estimate_gas().await.finish().await?;

        Ok(result.tx_hash().encode_hex().into())
    }

    async fn eth_sign(params: Params<'_>, ctx: MutexGuard<'_, Ctx>) -> Result<serde_json::Value> {
        use sign_message::*;

        let params = params.parse::<Vec<Option<String>>>().unwrap();
        let msg = params[0].as_ref().cloned().unwrap();
        // TODO where should this be used?
        // let address = Address::from_str(&params[1].as_ref().cloned().unwrap()).unwrap();

        let wallets = Wallets::read().await;

        let network = ctx.network().await;
        let wallet = wallets.get_current_wallet();

        let mut signer = SignMessage::build()
            .set_wallet(wallet)
            .set_wallet_path(wallet.get_current_path())
            .set_network(network)
            .set_string_data(msg)
            .build();

        // TODO: ensure from == signer

        let result = signer.finish().await?;

        Ok(format!("0x{}", result).into())
    }

    async fn eth_sign_typed_data_v4(
        params: Params<'_>,
        ctx: MutexGuard<'_, Ctx>,
    ) -> Result<serde_json::Value> {
        let params = params.parse::<Vec<Option<String>>>().unwrap();
        // TODO where should this be used?
        // let address = Address::from_str(&params[0].as_ref().cloned().unwrap()).unwrap();
        let data = params[1].as_ref().cloned().unwrap();
        let typed_data: eip712::TypedData = serde_json::from_str(&data).unwrap();

        let wallets = Wallets::read().await;

        let wallet = wallets.get_current_wallet();
        let network = ctx.network().await;

        let mut signer = SignMessage::build()
            .set_wallet(wallet)
            .set_wallet_path(wallet.get_current_path())
            .set_network(network)
            .set_typed_data(typed_data)
            .build();

        let result = signer.finish().await?;

        Ok(format!("0x{}", result).into())
    }

    // async fn unimplemented(params: Params<'_>, _: Ctx) -> jsonrpc_core::Result<serde_json::Value> {
    //     tracing::warn!("unimplemented method called: {:?}", params);
    //
    //     Err(jsonrpc_core::Error::internal_error())
    // }
}
