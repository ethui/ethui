use async_trait::async_trait;
use iron_db::DB;
use iron_types::{GlobalState, UISender};
use once_cell::sync::OnceCell;
use tokio::sync::{RwLock, RwLockReadGuard, RwLockWriteGuard};

use super::Alchemy;

static ALCHEMY: OnceCell<RwLock<Alchemy>> = OnceCell::new();

pub async fn init(db: DB, window_snd: UISender) {
    let instance = Alchemy::new(db, window_snd);
    ALCHEMY.set(RwLock::new(instance)).unwrap();
}

#[async_trait]
impl GlobalState for Alchemy {
    async fn read<'a>() -> RwLockReadGuard<'a, Self> {
        ALCHEMY.get().unwrap().read().await
    }

    async fn write<'a>() -> RwLockWriteGuard<'a, Self> {
        ALCHEMY.get().unwrap().write().await
    }
}
