use alloy_primitives::Address;
use clap::Parser;
use color_eyre::eyre::Result;
use serde::Deserialize;
use std::{collections::BTreeSet, path::PathBuf};

#[derive(Debug, clap::Parser)]
struct Args {
    #[clap(long, default_value = "iron-indexer.toml", env = "IRON_INDEXER_CONFIG")]
    config: PathBuf,
}

#[derive(Deserialize, Debug)]
pub struct Config {
    pub db: PathBuf,
    pub chain_id: u64,

    #[serde(default = "default_from_block")]
    pub start_block: u64,

    pub addresses: BTreeSet<Address>,
}

impl Config {
    pub fn read() -> Result<Self> {
        let args = Args::parse();

        Ok(toml::from_str(&std::fs::read_to_string(
            args.config.as_path(),
        )?)?)
    }
}

fn default_from_block() -> u64 {
    1
}
