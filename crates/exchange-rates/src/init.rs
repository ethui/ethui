use std::path::PathBuf;

use crate::types::{ChainlinkFeedData, ChainlinkId};
use crate::Error;
use reqwest::Client;
use serde_json::Value;
use tokio::fs::File;
use tokio::io::AsyncWriteExt;

pub async fn init() {
    let _ = init_chainlink_feeds().await;
}

pub async fn init_chainlink_feeds() -> Result<(), Error> {
    let config_url = "../crates/exchange-rates/data/chainlink.json";
    let config_str = tokio::fs::read_to_string(config_url).await?;

    let response: ChainlinkId = serde_json::from_str(&config_str)?;
    let client = Client::new();

    let base_path = PathBuf::from("../target/exchange-rates/chainlink");
    tokio::fs::create_dir_all(&base_path).await?;

    for (id, network) in response.networks {
        let rdd_response = client.get(&network.rdd_url).send().await?;
        let rdd_data: Value = rdd_response.json().await?;

        let chainlink_feed: Vec<ChainlinkFeedData> = serde_json::from_value(rdd_data.clone())?;

        let file_name = format!("{}.json", id);
        let file_path = base_path.join(file_name);
        let mut file = File::create(file_path).await?;
        let serialized_data = serde_json::to_string_pretty(&chainlink_feed)?;
        file.write_all(serialized_data.as_bytes()).await?;
    }
    Ok(())
}
