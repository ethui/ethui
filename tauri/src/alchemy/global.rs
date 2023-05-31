use crate::{db::DB, types::GlobalState};
use async_trait::async_trait;
use once_cell::sync::OnceCell;
use tokio::sync::{RwLock, RwLockReadGuard, RwLockWriteGuard};

use super::Alchemy;

static ALCHEMY: OnceCell<RwLock<Alchemy>> = OnceCell::new();

#[async_trait]
impl GlobalState for Alchemy {
    /// The only needed state to initialize `Alchemy` is a sender to the tauri event loop
    type Initializer = DB;

    async fn init(db: Self::Initializer) {
        let instance = Alchemy::new(db);
        instance.fetch_balances().await.unwrap();
        ALCHEMY.set(RwLock::new(instance)).unwrap();
    }

    async fn read<'a>() -> RwLockReadGuard<'a, Self> {
        ALCHEMY.get().unwrap().read().await
    }

    async fn write<'a>() -> RwLockWriteGuard<'a, Self> {
        ALCHEMY.get().unwrap().write().await
    }
}
