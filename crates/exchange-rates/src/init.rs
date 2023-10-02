use async_trait::async_trait;
use iron_types::GlobalState;
use once_cell::sync::Lazy;
use serde::Deserialize;
use std::collections::HashMap;
use tokio::sync::{RwLock, RwLockReadGuard, RwLockWriteGuard};

use super::feed::Feed;
use super::Feeds;

static FEEDS: Lazy<RwLock<Feeds>> = Lazy::new(|| {
    // Embed the JSON file in the binary
    let feeds_str = include_str!("../res/feeds.json");

    #[derive(Deserialize)]
    struct InputFeeds {
        feeds: HashMap<u64, HashMap<String, HashMap<String, Vec<Feed>>>>,
        rpcs: HashMap<u64, Vec<String>>,
    }

    let res: InputFeeds = serde_json::from_str(feeds_str).unwrap();
    let mut feeds = Feeds {
        feeds: HashMap::new(),
        rpcs: res.rpcs,
    };

    for (k1, v1) in res.feeds {
        for (k2, v2) in v1 {
            for (k3, v3) in v2 {
                feeds.feeds.insert((k1, k2.clone(), k3.clone()), v3);
            }
        }
    }

    RwLock::new(feeds)
});

#[async_trait]
impl GlobalState for Feeds {
    async fn read<'a>() -> RwLockReadGuard<'a, Self> {
        Lazy::get(&FEEDS).unwrap().read().await
    }

    async fn write<'a>() -> RwLockWriteGuard<'a, Self> {
        Lazy::get(&FEEDS).unwrap().write().await
    }
}
