use jsonrpsee::RpcModule;

pub mod eth;
pub mod net;
pub mod wallet;
pub mod web3;

pub fn module() -> RpcModule<()> {
    let mut module = RpcModule::new(());
    module
        .merge(eth::EthApiServer::into_rpc(eth::EthRpc))
        .unwrap();
    module
        .merge(net::NetApiServer::into_rpc(net::NetRpc))
        .unwrap();
    module
        .merge(wallet::WalletApiServer::into_rpc(wallet::WalletRpc))
        .unwrap();
    module
}
