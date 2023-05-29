pub mod commands;
mod error;
mod queries;

use std::{path::PathBuf, str::FromStr};

use ethers::{
    providers::{Http, Middleware, Provider},
    types::{Address, U256},
};
use serde::Serialize;
use sqlx::{
    sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions, SqliteSynchronous},
    Row,
};
use url::Url;

pub use self::error::{Error, Result};
use crate::types::events::Tx;
use crate::{
    foundry::calculate_code_hash,
    live_networks_listener::AlchemyResponse,
    types::{Event, Events},
};

#[derive(Debug, Clone)]
pub struct DB {
    pub pool: sqlx::Pool<sqlx::Sqlite>,
}

impl DB {
    pub async fn connect(path: &PathBuf) -> Result<Self> {
        let connect_options = SqliteConnectOptions::new()
            .filename(path)
            .create_if_missing(true)
            .journal_mode(SqliteJournalMode::Wal)
            .synchronous(SqliteSynchronous::Normal)
            .foreign_keys(true);

        let pool = SqlitePoolOptions::new()
            .connect_with(connect_options)
            .await?;

        let db = Self { pool };
        db.migrate().await?;

        Ok(db)
    }

    pub async fn save_balances(&self, balances: AlchemyResponse, chain_id: u32) -> Result<()> {
        let mut conn = self.tx().await?;

        for balance in balances.token_balances {
            queries::erc20_update_balance(
                balance.contract_address,
                balances.address,
                chain_id,
                balance.token_balance,
            )
            .execute(&mut conn)
            .await?;
        }

        conn.commit().await?;
        Ok(())
    }

    pub async fn save_events<T: Into<Events> + Sized + Send>(
        &self,
        chain_id: u32,
        events: T,
        http_url: Url,
    ) -> Result<()> {
        let mut conn = self.tx().await?;

        for tx in events.into().0.iter() {
            // TODO: report this errors in await?. Currently they're being silently ignored, because the task just gets killed
            match tx {
                Event::Tx(ref tx) => {
                    queries::insert_transaction(tx, chain_id)
                        .execute(&mut conn)
                        .await?;
                }

                Event::ContractDeployed(ref tx) => {
                    let provider: Provider<Http> =
                        Provider::<Http>::try_from(&http_url.to_string()).unwrap();
                    let code_hash: Option<String> = provider
                        .get_code(tx.address, None)
                        .await
                        .ok()
                        .map(|v| calculate_code_hash(&v.to_string()).to_string());

                    queries::insert_contract(tx, chain_id, code_hash)
                        .execute(&mut conn)
                        .await?;
                }

                // TODO: what to do if we don't know this contract, and don't have balances yet? (e.g. in a fork)
                Event::ERC20Transfer(transfer) => {
                    // update from's balance
                    if !transfer.from.is_zero() {
                        let current =
                            queries::erc20_read_balance(transfer.contract, transfer.from, chain_id)
                                .fetch_one(&mut conn)
                                .await?;

                        queries::erc20_update_balance(
                            transfer.contract,
                            transfer.from,
                            chain_id,
                            current - transfer.value,
                        )
                        .execute(&mut conn)
                        .await?;
                    }

                    // update to's balance
                    if !transfer.to.is_zero() {
                        let current =
                            queries::erc20_read_balance(transfer.contract, transfer.to, chain_id)
                                .fetch_one(&mut conn)
                                .await
                                .unwrap_or(U256::zero());

                        queries::erc20_update_balance(
                            transfer.contract,
                            transfer.to,
                            chain_id,
                            current + transfer.value,
                        )
                        .execute(&mut conn)
                        .await?;
                    }
                }

                Event::ERC721Transfer(ref transfer) => {
                    queries::erc721_transfer(transfer, chain_id)
                        .execute(&mut conn)
                        .await?;
                }
            }
        }
        conn.commit().await?;
        Ok(())
    }

    async fn get_transactions(&self, chain_id: u32, from_or_to: Address) -> Result<Vec<Tx>> {
        let res: Vec<_> = sqlx::query(
            r#" SELECT *
            FROM transactions
            WHERE chain_id = ?
            AND (from_address = ? or to_address = ?) COLLATE NOCASE
            ORDER BY block_number DESC, position DESC"#,
        )
        .bind(chain_id)
        .bind(format!("0x{:x}", from_or_to))
        .bind(format!("0x{:x}", from_or_to))
        .map(|row| Tx::try_from(&row).unwrap())
        .fetch_all(self.pool())
        .await?;

        Ok(res)
    }

    pub async fn get_contracts(&self, chain_id: u32) -> Result<Vec<StoredContract>> {
        let res: Vec<_> = sqlx::query(
            r#" SELECT *
            FROM contracts
            WHERE chain_id = ? "#,
        )
        .bind(chain_id)
        .map(|row| StoredContract {
            address: Address::from_str(row.get::<&str, _>("address")).unwrap(),
            deployed_code_hash: row.get("deployed_code_hash"),
        })
        .fetch_all(self.pool())
        .await?;

        Ok(res)
    }

    pub async fn get_balances(
        &self,
        chain_id: u32,
        address: Address,
    ) -> Result<Vec<(Address, U256)>> {
        let res: Vec<_> = sqlx::query(
            r#" SELECT contract, balance AS balance
            FROM balances
            WHERE chain_id = ? AND owner = ? "#,
        )
        .bind(chain_id)
        .bind(format!("0x{:x}", address))
        .map(|row| {
            (
                Address::from_str(&row.get::<String, _>("contract")).unwrap(),
                U256::from_dec_str(row.get::<&str, _>("balance")).unwrap(),
            )
        })
        .fetch_all(self.pool())
        .await?;

        Ok(res)
    }

    pub async fn truncate_events(&self, chain_id: u32) -> Result<()> {
        sqlx::query("DELETE FROM transactions WHERE chain_id = ?")
            .bind(chain_id)
            .execute(self.pool())
            .await?;

        sqlx::query("DELETE FROM contracts WHERE chain_id = ?")
            .bind(chain_id)
            .execute(self.pool())
            .await?;

        sqlx::query("DELETE FROM balances WHERE chain_id = ?")
            .bind(chain_id)
            .execute(self.pool())
            .await?;

        sqlx::query("DELETE FROM nft_tokens WHERE chain_id = ?")
            .bind(chain_id)
            .execute(self.pool())
            .await?;

        Ok(())
    }

    pub fn pool(&self) -> &sqlx::Pool<sqlx::Sqlite> {
        &self.pool
    }

    pub async fn tx(&self) -> Result<sqlx::Transaction<sqlx::Sqlite>> {
        Ok(self.pool.clone().begin().await?)
    }

    async fn migrate(&self) -> Result<()> {
        let pool = self.pool.clone();

        sqlx::migrate!("../migrations/").run(&pool).await?;

        Ok(())
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StoredContract {
    address: Address,
    deployed_code_hash: String,
}
