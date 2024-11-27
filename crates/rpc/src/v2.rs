use jsonrpsee::core::async_trait;
use jsonrpsee::proc_macros::rpc;
use jsonrpsee::Extensions;
use jsonrpsee::{types::ErrorObjectOwned, RpcModule};

pub fn module() -> RpcModule<()> {
    let mut module = RpcModule::new(());
    module.merge(EthServer::into_rpc(EthRpc)).unwrap();
    module.merge(NetServer::into_rpc(NetRpc)).unwrap();
    module.merge(EthuiServer::into_rpc(EthuiRpc)).unwrap();
    module
}

#[rpc(server)]
trait Eth {
    #[method(name = "foo")]
    async fn get_block_by_number(&self) -> Result<(), ErrorObjectOwned>;
}

#[rpc(server)]
trait Ethui {
    #[method(name = "foo", with_extensions)]
    async fn foo(&self) -> Result<(), ErrorObjectOwned>;
}

#[rpc(server, namespace = "net")]
trait Net {
    #[method(name = "version")]
    async fn version(&self) -> Result<(), ErrorObjectOwned>;
}

struct EthRpc;
#[async_trait]
impl EthServer for EthRpc {
    async fn get_block_by_number(&self) -> Result<(), ErrorObjectOwned> {
        dbg!("get_block_by_number");
        Ok(())
    }
}

struct EthuiRpc;
#[async_trait]
impl EthuiServer for EthuiRpc {
    async fn foo(&self, ext: &Extensions) -> Result<(), ErrorObjectOwned> {
        dbg!("foo");
        Ok(())
    }
}

struct NetRpc;
#[async_trait]
impl NetServer for NetRpc {
    async fn version(&self) -> Result<(), ErrorObjectOwned> {
        dbg!("version");
        Ok(())
    }
}
