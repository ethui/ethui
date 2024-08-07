use std::collections::HashMap;
use std::path::PathBuf;

use crate::types::{ChainlinkConfig, ChainlinkId, ChainlinkFeedData, Feeds};
use async_trait::async_trait;
use ethui_types::GlobalState;
use once_cell::sync::Lazy;
use reqwest::Client;
use serde_json::Value;
use tokio::fs::File;
use tokio::io::AsyncWriteExt;
use tokio::sync::{RwLock, RwLockReadGuard, RwLockWriteGuard};

pub(crate) static FEEDS: Lazy<RwLock<Feeds>> = Lazy::new(|| {
    RwLock::new(Feeds {
        feeds: HashMap::new(),
    })
});

pub async fn init() -> Result<(), Box<dyn std::error::Error>> {
    let config_url = "../crates/exchange-rates/data/chainlink.json";
    let config_str = match tokio::fs::read_to_string(config_url).await {
        Ok(content) => content,
        Err(e) => {
            return Err(Box::new(e));
        }
    };

    let response: ChainlinkId = serde_json::from_str(&config_str)?;
    let client = Client::new();
    let mut feeds = Feeds {
        feeds: HashMap::new(),
    };
 
    let base_path = PathBuf::from("../target/tmp/exchange-rates/chainlink");
    tokio::fs::create_dir_all(&base_path).await?;

    for (id, network) in response.networks {
        let rdd_response = client.get(&network.rdd_url).send().await?;
        let rdd_data: Value = rdd_response.json().await?;

        feeds.feeds.insert(id.clone(), rdd_data.clone());

        let file_name = format!("{}.json", id);
        let file_path = base_path.join(file_name);
        let mut file = File::create(file_path).await?;
        let serialized_data = serde_json::to_string_pretty(&rdd_data)?;
        file.write_all(serialized_data.as_bytes()).await?;
    }
    Ok(())
}

#[async_trait]
impl GlobalState for Feeds {
    async fn read<'a>() -> RwLockReadGuard<'a, Self> {
        Lazy::get(&FEEDS).unwrap().read().await
    }

    async fn write<'a>() -> RwLockWriteGuard<'a, Self> {
        Lazy::get(&FEEDS).unwrap().write().await
    }
}
