use async_trait::async_trait;
use iron_broadcast::InternalMsg;
use iron_types::GlobalState;
use once_cell::sync::Lazy;
use tokio::sync::{RwLock, RwLockReadGuard, RwLockWriteGuard};

use crate::{peers::Peers, server::server_loop};

static PEERS: Lazy<RwLock<Peers>> = Lazy::new(Default::default);

pub async fn init() {
    tokio::spawn(async { server_loop().await });
    tokio::spawn(async { receiver().await });
}

#[async_trait]
impl GlobalState for Peers {
    async fn read<'a>() -> RwLockReadGuard<'a, Self> {
        PEERS.read().await
    }

    async fn write<'a>() -> RwLockWriteGuard<'a, Self> {
        PEERS.write().await
    }
}

async fn receiver() -> ! {
    let mut rx = iron_broadcast::subscribe_internal().await;

    loop {
        if let Ok(msg) = rx.recv().await {
            use InternalMsg::*;

            match msg {
                ChainChanged(chain_id, affinity) => {
                    Peers::read()
                        .await
                        .broadcast_chain_changed(chain_id, domain, affinity)
                        .await
                }
                AccountsChanged(accounts) => {
                    Peers::read().await.broadcast_accounts_changed(accounts)
                }
                _ => {}
            }
        }
    }
}
