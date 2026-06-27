mod client;
mod networks;
mod types;
mod utils;

use ethui_db::Db;
use ethui_types::prelude::*;
pub use networks::supports_network;
use tracing::instrument;
pub use types::{Erc20Metadata, ErcMetadataResponse, ErcOwnersResponse};
pub use utils::{get_alchemy, get_current_api_key};

use self::networks::default_from_block;
use crate::client::{Client, Direction};

pub struct Alchemy {
    chain_id: u64,
    db: Db,
    client: Client,
}

impl Alchemy {
    pub fn new(api_key: &str, db: Db, chain_id: u64) -> Result<Self> {
        Ok(Self {
            chain_id,
            db,
            client: Client::new(chain_id, api_key)?,
        })
    }

    pub async fn fetch_updates(&self, address: Address) -> Result<()> {
        self.fetch_native_balances(address).await?;
        self.fetch_erc20_balances(address).await?;
        self.fetch_transfers(address).await?;
        Ok(())
    }

    #[instrument(skip(self), level = "trace")]
    async fn fetch_transfers(&self, address: Address) -> Result<()> {
        let key = (self.chain_id, "transactions", address);
        let last_tip: Option<u64> = self.db.kv_get(&key).await?;

        let from_block = last_tip.unwrap_or_else(|| default_from_block(self.chain_id));
        let latest = self.client.get_block_number().await?;

        // if tip - 1 == latest, we're up to date, nothing to do
        if from_block.saturating_sub(1) == latest {
            return Ok(());
        }

        let inc = self
            .client
            .get_asset_transfers(Direction::From(address), from_block, latest)
            .await?;
        let out = self
            .client
            .get_asset_transfers(Direction::To(address), from_block, latest)
            .await?;

        tracing::trace!("inc {}, out {}", inc.0.len(), out.0.len());

        let tip = out
            .0
            .iter()
            .chain(inc.0.iter())
            .map(|tx| tx.block_number)
            .fold(u64::MIN, |a, b| a.max(b.unwrap_or(0)));

        self.db.insert_transactions(self.chain_id, inc.0).await?;
        self.db.insert_transactions(self.chain_id, out.0).await?;
        self.db.save_erc20_metadatas(self.chain_id, inc.1).await?;
        self.db.save_erc20_metadatas(self.chain_id, out.1).await?;

        if tip > u64::MIN {
            self.db.kv_set(&key, &tip).await?;
        }

        Ok(())
    }

    #[instrument(skip(self), level = "trace")]
    async fn fetch_native_balances(&self, address: Address) -> Result<()> {
        let balance = self.client.get_native_balance(address).await?;
        self.db
            .save_native_balance(balance, self.chain_id, address)
            .await?;

        Ok(())
    }

    #[instrument(skip(self), level = "trace")]
    async fn fetch_erc20_balances(&self, address: Address) -> Result<()> {
        let balances = self.client.get_erc20_balances(address).await?;
        self.db
            .save_erc20_balances(self.chain_id, address, balances)
            .await?;

        Ok(())
    }

    #[instrument(skip(self), level = "trace")]
    pub async fn fetch_erc20_metadata(&self, address: Address) -> Result<Erc20Metadata> {
        let metadata = self.client.get_erc20_metadata(address).await?;
        Ok(metadata)
    }

    #[instrument(skip(self), level = "trace")]
    pub async fn fetch_erc_metadata(
        &self,
        address: Address,
        token_id: U256,
        _type: String,
    ) -> Result<ErcMetadataResponse> {
        let metadata_response = self
            .client
            .get_erc_metadata(address, token_id, _type)
            .await?;
        Ok(metadata_response)
    }

    #[instrument(skip(self), level = "trace")]
    pub async fn fetch_erc_owners(&self, address: Address) -> Result<ErcOwnersResponse> {
        let owners_response = self.client.get_erc_owners(address).await?;
        Ok(owners_response)
    }
}
