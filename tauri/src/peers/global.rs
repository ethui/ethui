use async_trait::async_trait;
use once_cell::sync::Lazy;
use tokio::sync::{mpsc, RwLock, RwLockReadGuard, RwLockWriteGuard};

use super::Peers;
use crate::{app, types::GlobalState};

static PEERS: Lazy<RwLock<Peers>> = Lazy::new(Default::default);

#[async_trait]
impl GlobalState for Peers {
    /// The only needed state to initialize `Peers` is a sender to the tauri event loop
    type Initializer = mpsc::UnboundedSender<app::Event>;

    async fn init(sender: Self::Initializer) {
        let mut peers = PEERS.write().await;
        peers.window_snd = Some(sender);
    }

    async fn read<'a>() -> RwLockReadGuard<'a, Self> {
        PEERS.read().await
    }

    async fn write<'a>() -> RwLockWriteGuard<'a, Self> {
        PEERS.write().await
    }
}
