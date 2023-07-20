use async_trait::async_trait;
use iron_broadcast::Msg;
use iron_types::{AppEvent, GlobalState};
use once_cell::sync::OnceCell;
use tokio::sync::{mpsc, RwLock, RwLockReadGuard, RwLockWriteGuard};

use super::Peers;

static PEERS: OnceCell<RwLock<Peers>> = OnceCell::new();

#[async_trait]
impl GlobalState for Peers {
    /// The only needed state to initialize `Peers` is a sender to the tauri event loop
    type Initializer = mpsc::UnboundedSender<AppEvent>;

    async fn init(sender: Self::Initializer) {
        PEERS.set(RwLock::new(Peers::new(sender))).unwrap();

        tokio::spawn(async { receiver().await });
    }

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
                    Peers::write().await.broadcast_chain_changed(chain_id, name)
                }
                Msg::AccountsChanged(accounts) => {
                    Peers::write().await.broadcast_accounts_changed(accounts)
                }
                _ => {}
            }
        }
    }
}
