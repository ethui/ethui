use async_trait::async_trait;
use once_cell::sync::OnceCell;
use tokio::sync::{mpsc, RwLock, RwLockReadGuard, RwLockWriteGuard};

use super::Peers;
use crate::{app, types::GlobalState};

static PEERS: OnceCell<RwLock<Peers>> = OnceCell::new();

#[async_trait]
impl GlobalState for Peers {
    /// The only needed state to initialize `Peers` is a sender to the tauri event loop
    type Initializer = mpsc::UnboundedSender<app::Event>;

    async fn init(sender: Self::Initializer) {
        PEERS.set(RwLock::new(Peers::new(sender))).unwrap();
    }

    async fn read<'a>() -> RwLockReadGuard<'a, Self> {
        PEERS.get().unwrap().read().await
    }

    async fn write<'a>() -> RwLockWriteGuard<'a, Self> {
        PEERS.get().unwrap().write().await
    }
}
