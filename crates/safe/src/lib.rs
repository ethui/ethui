pub mod commands;
mod error;
pub mod types;
mod utils;

use crate::error::{Error, Result};
use crate::types::SafeContracts;
use crate::utils::get_safe_endpoint;
use ethui_db::Db;
use ethui_types::{Address, SafeContractData};
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
        let safe_contracts = self.fetch_safe_contract(address).await?;
        self.fetch_safe_contract_data(address, safe_contracts)
            .await?;
        Ok(())
    }

    async fn fetch_safe_contract(&self, address: Address) -> Result<Vec<String>> {
        let path = format!("{}/api/v1/owners/{}/safes/", self.url, address);
        let response = reqwest::get(&path)
            .await
            .map_err(Error::Reqwest)?
            .text()
            .await
            .map_err(Error::Reqwest)?;

        let response_json: SafeContracts = serde_json::from_str(&response).map_err(Error::Serde)?;

        Ok(response_json.safes)
    }

    pub async fn fetch_safe_contract_data(
        &self,
        address: Address,
        contracts: Vec<String>,
    ) -> Result<()> {
        for contract_address in contracts {
            let path = format!("{}/api/v1/safes/{}/", self.url, contract_address);
            let response = reqwest::get(&path)
                .await
                .map_err(Error::Reqwest)?
                .text()
                .await
                .map_err(Error::Reqwest)?;
            let response_json: SafeContractData =
                serde_json::from_str(&response).map_err(Error::Serde)?;
            self.db
                .save_safe_contract_data(address, self.chain_id, response_json)
                .await?;
        }

        Ok(())
    }
}
