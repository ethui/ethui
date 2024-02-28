use async_trait::async_trait;
use iron_broadcast::InternalMsg;
use iron_settings::Settings;
use iron_types::GlobalState;
use once_cell::sync::OnceCell;
use tokio::sync::{RwLock, RwLockReadGuard, RwLockWriteGuard};

use super::Alchemy;

static ALCHEMY: OnceCell<RwLock<Alchemy>> = OnceCell::new();

pub async fn init() {
    let instance = Alchemy::default();
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
