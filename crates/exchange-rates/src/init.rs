use async_trait::async_trait;
use iron_types::GlobalState;
use once_cell::sync::OnceCell;
use serde::Deserialize;
use std::collections::HashMap;
use tokio::sync::{RwLock, RwLockReadGuard, RwLockWriteGuard};

use super::feed::Feed;
use super::Feeds;

static FEEDS: OnceCell<RwLock<Feeds>> = OnceCell::new();

pub async fn init() {
    // Embed the JSON file in the binary
    let feeds_str = include_str!("../res/feeds.json");

    #[derive(Deserialize)]
    struct InputFeeds {
        feeds: HashMap<String, HashMap<String, HashMap<String, Vec<Feed>>>>,
    }

    let res: InputFeeds = serde_json::from_str(feeds_str).unwrap();
    let mut feeds = Feeds {
        feeds: HashMap::new()
    };

    for (k1, v1) in res.feeds {
        for (k2, v2) in v1 {
            for (k3, v3) in v2 {
                feeds.feeds.insert((k1.clone(), k2.clone(), k3.clone()), v3);
            }
        }
    }

    FEEDS.set(RwLock::new(feeds)).unwrap();
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
