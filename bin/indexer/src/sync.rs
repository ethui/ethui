use alloy_primitives::Address;
use color_eyre::eyre::Result;
use reth_db::mdbx::tx::Tx;
use reth_db::mdbx::RO;
use reth_db::DatabaseEnv;
use reth_primitives::Header;
use reth_provider::{BlockNumReader, DatabaseProvider, HeaderProvider, ProviderFactory};
use std::time::Duration;
use std::{collections::BTreeSet, path::PathBuf};
use tokio::task::JoinHandle;
use tokio::time::sleep;
use tracing::info;

use crate::config::Config;
use crate::provider::get_reth_factory;

pub struct Sync {
    db: PathBuf,
    chain_id: u64,
    from_block: u64,
    to_block: Option<u64>,
    addresses: BTreeSet<Address>,
    factory: ProviderFactory<DatabaseEnv>,
    provider: DatabaseProvider<Tx<RO>>,
}

impl Sync {
    #[tracing::instrument(skip(config))]
    pub async fn start(config: &Config) -> Result<JoinHandle<Result<()>>> {
        let sync: Self = config.try_into()?;
        Ok(tokio::spawn(async move { sync.run().await }))
    }

    pub async fn run(mut self) -> Result<()> {
        let mut next_block = self.from_block;

        loop {
            match self.provider.header_by_number(next_block)? {
                None => {
                    if self.to_block.is_none() {
                        // if the db changes we need a new read tx otherwise it will see the old
                        // version
                        self.wait_new_block(next_block).await?;
                    } else {
                        // finished
                        break;
                    }
                }
                Some(header) => {
                    self.process_block(&header).await;
                    next_block += 1;
                }
            }
        }

        Ok(())
    }

    async fn wait_new_block(&mut self, block: u64) -> Result<()> {
        info!(event = "wait", block);
        loop {
            sleep(Duration::from_secs(2)).await;

            let provider = self.factory.provider()?;
            let latest = provider.last_block_number().unwrap();

            if latest >= block {
                info!("new block(s) found. from: {}, latest: {}", block, latest);
                self.provider = provider;
                return Ok(());
            }
        }
    }

    async fn process_block(&self, header: &Header) {
        info!(event = "process", block = header.number);

        // let block = provider
        //     .block_by_number(header.number)
        //     .expect("Failed to get block");
        // let mut tx = provider
        //     .read_transaction()
        //     .expect("Failed to create read transaction");
        // for tx in block.transactions {
        //     let tx = tx.expect("Failed to get transaction");
        //     let from = tx.from.expect("Failed to get from address");
        //     let to = tx.to.expect("Failed to get to address");
        //     if self.addresses.contains(&from) || self.addresses.contains(&to) {
        //         info!("found transaction: {}", tx.hash);
    }
}

impl TryFrom<&Config> for Sync {
    type Error = color_eyre::eyre::Error;

    fn try_from(config: &Config) -> Result<Self, Self::Error> {
        let factory = get_reth_factory(&config.db, config.chain_id)?;
        let provider: reth_provider::DatabaseProvider<Tx<RO>> = factory.provider()?;

        Ok(Self {
            db: config.db.clone(),
            chain_id: config.chain_id,
            from_block: config.start_block,
            to_block: None,
            addresses: config.addresses.clone(),
            factory,
            provider,
        })
    }
}
