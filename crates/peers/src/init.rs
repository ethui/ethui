use async_trait::async_trait;
use iron_broadcast::Msg;
use iron_types::{AppEvent, GlobalState};
use once_cell::sync::OnceCell;
use tokio::sync::{mpsc, RwLock, RwLockReadGuard, RwLockWriteGuard};

use super::Peers;

static PEERS: OnceCell<RwLock<Peers>> = OnceCell::new();

pub async fn init(sender: mpsc::UnboundedSender<AppEvent>) {
    PEERS.set(RwLock::new(Peers::new(sender))).unwrap();

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
            match msg {
                Msg::ChainChanged(chain_id, name) => {
                    Peers::read().await.broadcast_chain_changed(chain_id, name)
                }
                Msg::AccountsChanged(accounts) => {
                    Peers::read().await.broadcast_accounts_changed(accounts)
                }
                _ => {}
            }
        }
    }
}
