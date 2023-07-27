use iron_types::GlobalState;
use async_trait::async_trait;
use once_cell::sync::OnceCell;
use tokio::sync::{RwLock, RwLockReadGuard, RwLockWriteGuard};

use super::Feeds;

static FEEDS: OnceCell<RwLock<Feeds>> = OnceCell::new();

pub async fn init() {
    // Embed the JSON file in the binary
    let feeds_str = include_str!("../res/feeds.json");

    let res: Feeds = serde_json::from_str(feeds_str).unwrap();

    FEEDS.set(RwLock::new(res)).unwrap();
}

#[async_trait]
impl GlobalState for Feeds {
    async fn read<'a>() -> RwLockReadGuard<'a, Self> {
        FEEDS.get().unwrap().read().await
    }

    async fn write<'a>() -> RwLockWriteGuard<'a, Self> {
        FEEDS.get().unwrap().write().await
    }
}
