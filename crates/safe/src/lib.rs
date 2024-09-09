pub mod commands;
mod error;
mod types;
mod utils;

use std::str::FromStr;

use crate::error::{Error, Result};
use crate::types::OwnerSafeAccounts;
use crate::utils::get_safe_endpoint;
use ethui_db::Db;
use ethui_types::{Address, TokenMetadata, U256};
use url::Url;

#[derive(Debug)]
pub struct Safe {
    chain_id: u32,
    db: Db,
    url: Url,
}

impl Safe {
    pub fn new(db: Db, chain_id: u32) -> Result<Self> {
        Ok(Self {
            chain_id,
            db,
            url: get_safe_endpoint(chain_id)?,
        })
    }

    pub async fn fetch_updates(&self, address: Address) -> Result<()> {
        self.fetch_safe_addresses(address).await?;
        // self.fetch_safes_mstransactions.await?;
        Ok(())
    }

    async fn fetch_safe_addresses(&self, address: Address) -> Result<()> {
        let path = format!("{}/api/v1/owners/{}/safes/", self.url, address,);
        // Errors to be updated
        let response = reqwest::get(&path)
            .await
            .map_err(|_e| Error::ErcInvalid)?
            .text()
            .await
            .map_err(|_e| Error::ErcInvalid)?;

        let response_json: OwnerSafeAccounts =
            serde_json::from_str(&response).map_err(|_e| Error::ErcInvalid)?;
        for safe in response_json.safes {
            let metadata = TokenMetadata {
                address: Address::from_str(&safe).unwrap(),
                name: Some("Safe multi-sig".to_string()),
                symbol: Some("SAFEms".to_string()),
                decimals: Some(18),
            };
            let _save_metadata = self.db.save_erc20_metadata(self.chain_id, metadata).await?;
            let _save_balance = self
                .db
                .save_erc20_balance(
                    self.chain_id,
                    Address::from_str(&safe).unwrap(),
                    address,
                    U256::from(0),
                )
                .await?;
        }
        Ok(())
    }

    // async fn fetch_safe_multisig_txs(&self, safe_address: Address) -> Result<()> {
    //     let path = format!(
    //         "{}/api/safes/{}/multisig-transactions/",
    //         self.url, safe_address
    //     );
    //     let response = reqwest::get(&path)
    //         .await
    //         .map_err(|_e| Error::ErcInvalid)?
    //         .text()
    //         .await
    //         .map_err(|_e| Error::ErcInvalid)?;
    //
    //     Ok(())
    // }
}
