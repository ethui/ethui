use jsonrpsee::{
    core::{async_trait, RpcResult},
    proc_macros::rpc,
};

pub struct WalletRpc;

#[rpc(server, namespace = "wallet")]
pub trait WalletApi {
    #[method(name = "addEthereumChain")]
    async fn add_ethereum_chain(&self, chain: String) -> RpcResult<String>;
}

#[async_trait]
impl WalletApiServer for WalletRpc {
    async fn add_ethereum_chain(&self, _chain: String) -> RpcResult<String> {
        todo!()
    }
}
