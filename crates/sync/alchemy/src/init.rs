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

    tokio::spawn(async { receiver().await });
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

async fn receiver() -> ! {
    let mut rx = iron_broadcast::subscribe_internal().await;

    loop {
        if let Ok(msg) = rx.recv().await {
            use InternalMsg::*;

            if let SettingsUpdated = msg {
                let settings = Settings::read().await;
                let api_key = settings.inner.alchemy_api_key.clone();

                Alchemy::write().await.set_api_key(api_key);
            }
        }
    }
}
