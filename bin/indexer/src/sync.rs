use alloy_primitives::Address;
use color_eyre::eyre::Result;
use reth_db::mdbx::tx::Tx;
use reth_db::mdbx::RO;
use reth_db::DatabaseEnv;
use reth_primitives::Header;
use reth_provider::{
    BlockNumReader, BlockReader, DatabaseProvider, HeaderProvider, ProviderFactory,
    ReceiptProvider, TransactionsProvider,
};
use std::time::Duration;
use std::{collections::BTreeSet, path::PathBuf};
use tokio::task::JoinHandle;
use tokio::time::sleep;
use tracing::{info, trace};

use crate::config::Config;

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
                    self.process_block(&header).await?;
                    next_block += 1;
                }
            }
        }

        Ok(())
    }

    async fn wait_new_block(&mut self, block: u64) -> Result<()> {
        trace!(event = "wait", block);
        loop {
            sleep(Duration::from_secs(2)).await;

            let provider = self.factory.provider()?;
            let latest = provider.last_block_number().unwrap();

            if latest >= block {
                trace!("new block(s) found. from: {}, latest: {}", block, latest);
                self.provider = provider;
                return Ok(());
            }
        }
    }

    async fn process_block(&self, header: &Header) -> Result<()> {
        info!(event = "process", block = header.number);

        let indices = match self.provider.block_body_indices(header.number)? {
            Some(indices) => indices,
            None => return Ok(()),
        };

        for tx_id in indices.first_tx_num..indices.first_tx_num + indices.tx_count {
            let tx = match self.provider.transaction_by_id_no_hash(tx_id)? {
                Some(tx) => tx,
                None => continue,
            };

            // let receipt = match self.provider.receipt(tx_id)? {
            //     Some(receipt) => receipt,
            //     None => continue,
            // };

            // check tx origin
            if let Some(from) = tx.recover_signer() {
                if self.addresses.contains(&from) {
                    info!("found tx {} for address {}", tx.hash(), from);
                }
            }

            // check tx destination
            if let Some(to) = tx.to() {
                if self.addresses.contains(&to) {
                    info!("found tx {} for address {}", tx.hash(), to);
                }
            }

            // dbg!(receipt.logs);

            // let receipt = match self.provider.receipt(tx_id)? {
            //     Some(receipt) => receipt,
            //     None => continue,
            // };
        }

        Ok(())
    }
}

impl TryFrom<&Config> for Sync {
    type Error = color_eyre::eyre::Error;

    fn try_from(config: &Config) -> Result<Self, Self::Error> {
        let factory: ProviderFactory<reth_db::DatabaseEnv> = (&config.reth).try_into()?;
        let provider: reth_provider::DatabaseProvider<Tx<RO>> = factory.provider()?;

        Ok(Self {
            db: config.reth.db.clone(),
            chain_id: config.reth.chain_id,
            from_block: config.reth.start_block,
            to_block: None,
            addresses: config.sync.seed_addresses.clone(),
            factory,
            provider,
        })
    }
}
