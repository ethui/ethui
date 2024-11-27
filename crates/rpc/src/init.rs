use ethui_types::GlobalState;
use jsonrpsee::core::async_trait;
use once_cell::sync::Lazy;
use tokio::sync::{RwLock, RwLockReadGuard, RwLockWriteGuard};

use crate::server::RpcServer;

static RPC: Lazy<RwLock<RpcServer>> = Lazy::new(Default::default);

pub async fn init(port: u16) {
    let mut rpc = RPC.write().await;
    rpc.start(port).await;
}

#[async_trait]
impl GlobalState for RpcServer {
    async fn read<'a>() -> RwLockReadGuard<'a, Self> {
        RPC.read().await
    }

    async fn write<'a>() -> RwLockWriteGuard<'a, Self> {
        RPC.write().await
    }
}
