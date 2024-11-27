use alloy::primitives::{Bytes, B256};
use jsonrpsee::{
    core::{async_trait, RpcResult},
    proc_macros::rpc,
};

pub struct Web3Rpc;

#[rpc(server, namespace = "web3")]
pub trait Web3Api {
    /// Returns current client version.
    #[method(name = "clientVersion")]
    async fn client_version(&self) -> RpcResult<String>;

    /// Returns sha3 of the given data.
    #[method(name = "sha3")]
    fn sha3(&self, input: Bytes) -> RpcResult<B256>;
}

#[async_trait]
impl Web3ApiServer for Web3Rpc {
    async fn client_version(&self) -> RpcResult<String> {
        todo!()
    }

    fn sha3(&self, _input: Bytes) -> RpcResult<B256> {
        todo!()
    }
}
