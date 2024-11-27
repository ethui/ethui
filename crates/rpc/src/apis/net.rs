use alloy::primitives::U64;
use jsonrpsee::{
    core::{async_trait, RpcResult},
    proc_macros::rpc,
};

pub struct NetRpc;

#[rpc(server, namespace = "net")]
pub trait NetApi {
    /// Returns the network ID.
    #[method(name = "version")]
    fn version(&self) -> RpcResult<String>;

    /// Returns number of peers connected to node.
    #[method(name = "peerCount")]
    fn peer_count(&self) -> RpcResult<U64>;

    /// Returns true if client is actively listening for network connections.
    /// Otherwise false.
    #[method(name = "listening")]
    fn is_listening(&self) -> RpcResult<bool>;
}

#[async_trait]
impl NetApiServer for NetRpc {
    fn version(&self) -> RpcResult<String> {
        todo!()
    }

    fn peer_count(&self) -> RpcResult<U64> {
        todo!()
    }

    fn is_listening(&self) -> RpcResult<bool> {
        todo!()
    }
}
