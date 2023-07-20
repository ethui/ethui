use async_trait::async_trait;
use iron_broadcast::InternalMsg;
use iron_types::{GlobalState, UISender};
use once_cell::sync::OnceCell;
use tokio::sync::{RwLock, RwLockReadGuard, RwLockWriteGuard};

use crate::{peers::Peers, server::server_loop};

static PEERS: OnceCell<RwLock<Peers>> = OnceCell::new();

pub fn init(sender: UISender) {
    PEERS.set(RwLock::new(Peers::new(sender))).unwrap();

    tokio::spawn(async { server_loop().await });
    tokio::spawn(async { receiver().await });
}

#[async_trait]
impl GlobalState for Peers {
    async fn read<'a>() -> RwLockReadGuard<'a, Self> {
        PEERS.get().unwrap().read().await
    }

    async fn write<'a>() -> RwLockWriteGuard<'a, Self> {
        PEERS.get().unwrap().write().await
    }
}

async fn receiver() -> ! {
    let mut rx = iron_broadcast::subscribe().await;

    loop {
        if let Ok(msg) = rx.recv().await {
            use InternalMsg::*;

            match msg {
                ChainChanged(chain_id, name) => {
                    Peers::read().await.broadcast_chain_changed(chain_id, name)
                }
                AccountsChanged(accounts) => {
                    Peers::read().await.broadcast_accounts_changed(accounts)
                }
                _ => {}
            }
        }
    }
}
