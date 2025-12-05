use std::{collections::HashSet, str::FromStr};

use ethui_types::{TokenBalance, TokenMetadata, prelude::*};
use tracing::instrument;

use crate::DbInner;

impl DbInner {
    pub async fn read_erc20_balance(
        &self,
        chain_id: u64,
        contract: Address,
        address: Address,
    ) -> Result<U256> {
        let chain_id = chain_id as i64;
        let contract = contract.to_string();
        let address = address.to_string();

        let row = sqlx::query!(
            r#"SELECT balance FROM balances WHERE chain_id = ? AND contract = ? AND owner = ?"#,
            chain_id,
            contract,
            address
        )
        .fetch_one(self.pool())
        .await?;

        Ok(U256::from_str_radix(&row.balance, 10).unwrap_or_default())
    }

    pub async fn save_erc20_balance(
        &self,
        chain_id: u64,
        contract: Address,
        address: Address,
        balance: U256,
    ) -> Result<()> {
        let chain_id = chain_id as i64;
        let contract = contract.to_string();
        let address = address.to_string();
        let balance = balance.to_string();

        sqlx::query!(
            r#"INSERT OR REPLACE INTO balances (chain_id, contract, owner, balance)
                        VALUES (?,?,?,?) "#,
            chain_id,
            contract,
            address,
            balance
        )
        .execute(self.pool())
        .await?;

        Ok(())
    }

    pub async fn save_erc20_balances(
        &self,
        chain_id: u64,
        address: Address,
        balances: Vec<(Address, U256)>,
    ) -> Result<()> {
        for (contract, balance) in balances {
            self.save_erc20_balance(chain_id, contract, address, balance)
                .await?;
        }

        Ok(())
    }

    #[instrument(level = "trace", skip(self))]
    pub async fn process_erc20_transfer(
        &self,
        chain_id: u64,
        contract: Address,
        from: Address,
        to: Address,
        value: U256,
    ) -> Result<()> {
        // update from's balance
        if !from.is_zero() {
            let current = self.read_erc20_balance(chain_id, contract, from).await?;
            self.save_erc20_balance(chain_id, contract, from, current - value)
                .await?;
        }

        // update to's balance
        if !to.is_zero() {
            let current = self
                .read_erc20_balance(chain_id, contract, to)
                .await
                .unwrap_or_default();
            self.save_erc20_balance(chain_id, contract, to, current + value)
                .await?;
        }

        Ok(())
    }

    pub async fn get_erc20_balances(
        &self,
        chain_id: u64,
        address: Address,
        include_blacklisted: bool,
    ) -> Result<Vec<TokenBalance>> {
        let address_str = address.to_string();
        let chain_id = chain_id as i64;

        let rows = sqlx::query!(
            r#"SELECT balances.contract, balances.balance, meta.decimals, meta.name, meta.symbol
            FROM balances
            LEFT JOIN tokens_metadata AS meta
              ON meta.chain_id = balances.chain_id AND meta.contract = balances.contract
            WHERE balances.chain_id = ? AND balances.owner = ? "#,
            chain_id,
            address_str
        )
        .fetch_all(self.pool())
        .await?;

        let blacklist: HashSet<Address> = if include_blacklisted {
            Default::default()
        } else {
            let rows = sqlx::query!(
                r#"SELECT address FROM erc20_blacklist WHERE chain_id = ? AND blacklisted = true"#,
                chain_id
            )
            .fetch_all(self.pool())
            .await?;

            rows.into_iter()
                .map(|r| Address::from_str(&r.address).unwrap())
                .collect()
        };

        Ok(rows
            .into_iter()
            .map(|r| TokenBalance {
                contract: Address::from_str(&r.contract.unwrap()).unwrap(),
                balance: U256::from_str_radix(&r.balance, 10).unwrap(),
                metadata: TokenMetadata {
                    address,
                    name: r.name,
                    symbol: r.symbol,
                    decimals: r.decimals.map(|r| r as u8),
                },
            })
            .filter(|b| !blacklist.contains(&b.contract))
            .collect())
    }

    pub async fn get_erc20_blacklist(
        &self,
        chain_id: u64,
        address: Address,
    ) -> Result<Vec<TokenBalance>> {
        let address_str = address.to_string();
        let chain_id = chain_id as i64;

        let rows = sqlx::query!(
            r#"SELECT balances.contract, balances.balance, meta.decimals, meta.name, meta.symbol
            FROM balances
            LEFT JOIN tokens_metadata AS meta
              ON meta.chain_id = balances.chain_id AND meta.contract = balances.contract
            WHERE balances.chain_id = ? AND balances.owner = ? "#,
            chain_id,
            address_str
        )
        .fetch_all(self.pool())
        .await?;

        let blacklist: HashSet<Address> = {
            let rows = sqlx::query!(
                r#"SELECT address FROM erc20_blacklist WHERE chain_id = ?"#,
                chain_id
            )
            .fetch_all(self.pool())
            .await?;

            rows.into_iter()
                .map(|r| Address::from_str(&r.address).unwrap())
                .collect()
        };

        Ok(rows
            .into_iter()
            .map(|r| TokenBalance {
                contract: Address::from_str(&r.contract.unwrap()).unwrap(),
                balance: U256::from_str_radix(&r.balance, 10).unwrap(),
                metadata: TokenMetadata {
                    address,
                    name: r.name,
                    symbol: r.symbol,
                    decimals: r.decimals.map(|r| r as u8),
                },
            })
            .filter(|b| blacklist.contains(&b.contract))
            .collect())
    }

    pub async fn get_erc20_missing_metadata(&self, chain_id: u64) -> Result<Vec<Address>> {
        let chain_id = chain_id as i64;
        let res: Vec<_> = sqlx::query!(
            r#"SELECT DISTINCT balances.contract
                FROM balances
                LEFT JOIN tokens_metadata AS meta
                ON meta.chain_id = balances.chain_id AND meta.contract = balances.contract
                WHERE balances.chain_id = ? AND meta.chain_id IS NULL"#,
            chain_id
        )
        .fetch_all(self.pool())
        .await?;

        Ok(res
            .into_iter()
            .filter_map(|r| Address::from_str(&r.contract.unwrap_or_default()).ok())
            .collect())
    }

    pub async fn get_erc20_metadata(
        &self,
        address: Address,
        chain_id: u64,
    ) -> Result<TokenMetadata> {
        let contract = address.to_string();
        let chain_id = chain_id as i64;

        let row = sqlx::query!(
            r#"SELECT decimals as 'decimals?', name as 'name?', symbol as 'symbol?'
                FROM tokens_metadata
                WHERE contract = ? AND chain_id = ?"#,
            contract,
            chain_id
        )
        .fetch_one(self.pool())
        .await?;

        Ok(TokenMetadata {
            address,
            name: row.name,
            symbol: row.symbol,
            decimals: row.decimals.map(|d| d as u8),
        })
    }

    pub async fn save_erc20_metadatas(
        &self,
        chain_id: u64,
        metadatas: Vec<TokenMetadata>,
    ) -> Result<()> {
        for metadata in metadatas {
            self.save_erc20_metadata(chain_id, metadata).await?;
        }
        Ok(())
    }

    pub async fn save_erc20_metadata(&self, chain_id: u64, metadata: TokenMetadata) -> Result<()> {
        let address = metadata.address.to_string();
        let chain_id = chain_id as i64;

        sqlx::query!(
            r#" INSERT OR REPLACE INTO tokens_metadata (contract, chain_id, decimals, name, symbol)
                        VALUES (?,?,?,?,?) "#,
            address,
            chain_id,
            metadata.decimals,
            metadata.name,
            metadata.symbol
        )
        .execute(self.pool())
        .await?;

        Ok(())
    }

    pub async fn set_erc20_blacklist(
        &self,
        chain_id: u64,
        address: Address,
        blacklisted: bool,
    ) -> Result<()> {
        let address = address.to_string();
        let chain_id = chain_id as i64;

        sqlx::query!(
            r#"INSERT INTO erc20_blacklist (chain_id,address,blacklisted) VALUES (?,?,?) ON CONFLICT DO UPDATE set blacklisted = ?"#,
            chain_id,
            address,
            blacklisted,
            blacklisted
        )
        .execute(self.pool())
        .await?;

        Ok(())
    }

    pub async fn clear_erc20_blacklist(&self, chain_id: u64, address: Address) -> Result<()> {
        let address = address.to_string();
        let chain_id = chain_id as i64;

        sqlx::query!(
            r#"DELETE FROM erc20_blacklist WHERE chain_id = ? AND address = ?"#,
            chain_id,
            address,
        )
        .execute(self.pool())
        .await?;

        Ok(())
    }
}
