pub mod commands;
mod error;
mod pagination;
mod queries;

use std::{path::PathBuf, str::FromStr};

use ethers::types::{Address, H256, U256};
use iron_types::{events::Tx, Erc721Collection, Erc721Token, Event, TokenBalance, TokenMetadata};
use serde::Serialize;
use sqlx::{
    sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions, SqliteSynchronous},
    Row,
};
use tracing::{instrument, trace};

pub use self::{
    error::{Error, Result},
    pagination::{Paginated, Pagination},
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

    pub async fn save_native_balance(
        &self,
        balance: U256,
        chain_id: u32,
        address: Address,
    ) -> Result<()> {
        let mut conn = self.tx().await?;
        queries::native_update_balance(balance, chain_id, address)
            .execute(&mut conn)
            .await?;
        conn.commit().await?;
        Ok(())
    }

    pub async fn get_erc20_metadata(
        &self,
        contract: Address,
        chain_id: u32,
    ) -> Result<TokenMetadata> {
        Ok(queries::erc20_read_metadata(contract, chain_id)
            .fetch_one(self.pool())
            .await?)
    }

    // TODO: Change this to an Into<T> of some kind, so we don't depend directly on AlchemyResponse here
    pub async fn save_erc20_balances(
        &self,
        chain_id: u32,
        address: Address,
        balances: Vec<(Address, U256)>,
    ) -> Result<()> {
        let mut conn = self.tx().await?;

        for (contract, balance) in balances {
            queries::erc20_update_balance(contract, address, chain_id, balance)
                .execute(&mut conn)
                .await?;
        }

        conn.commit().await?;
        Ok(())
    }

    pub async fn save_erc20_metadata(
        &self,
        address: Address,
        chain_id: u32,
        metadata: TokenMetadata,
    ) -> Result<()> {
        let mut conn = self.tx().await?;

        queries::update_erc20_metadata(address, chain_id, metadata)
            .execute(&mut conn)
            .await?;

        conn.commit().await?;
        Ok(())
    }

    #[instrument(level = "trace", skip(self, events))]
    pub async fn save_events(&self, chain_id: u32, events: Vec<Event>) -> Result<()> {
        let mut conn = self.tx().await?;

        for tx in events.iter() {
            // TODO: report this errors in await?. Currently they're being silently ignored, because the task just gets killed
            match tx {
                Event::Tx(ref tx) => {
                    trace!(tx = tx.hash.to_string());

                    queries::insert_transaction(tx, chain_id)
                        .execute(&mut conn)
                        .await?;
                }

                Event::ContractDeployed(ref tx) => {
                    trace!(contract = tx.address.to_string());

                    queries::insert_contract(tx, chain_id)
                        .execute(&mut conn)
                        .await?;
                }

                // TODO: what to do if we don't know this contract, and don't have balances yet? (e.g. in a fork)
                Event::ERC20Transfer(transfer) => {
                    trace!(
                        from = transfer.from.to_string(),
                        to = transfer.to.to_string(),
                        value = transfer.value.to_string()
                    );
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
                    trace!(
                        from = transfer.from.to_string(),
                        to = transfer.to.to_string(),
                        id = transfer.token_id.to_string()
                    );
                    queries::erc721_transfer(transfer, chain_id)
                        .execute(&mut conn)
                        .await?;
                }
            }
        }
        conn.commit().await?;
        Ok(())
    }

    pub async fn transaction_exists(&self, chain_id: u32, hash: H256) -> Result<bool> {
        let res = sqlx::query(
            r#"SELECT COUNT(*) > 0 as result FROM transactions WHERE chain_id = ? AND hash = ?"#,
        )
        .bind(chain_id)
        .bind(format!("0x{:x}", hash))
        .map(|row| row.get("result"))
        .fetch_one(self.pool())
        .await?;

        Ok(res)
    }

    async fn get_transactions(
        &self,
        chain_id: u32,
        from_or_to: Address,
        pagination: Pagination,
    ) -> Result<Paginated<Tx>> {
        let items: Vec<_> = sqlx::query(
            r#" SELECT *
            FROM transactions
            WHERE chain_id = ?
            AND (from_address = ? or to_address = ?) COLLATE NOCASE
            ORDER BY block_number DESC, position DESC
            LIMIT ? OFFSET ?"#,
        )
        .bind(chain_id)
        .bind(format!("0x{:x}", from_or_to))
        .bind(format!("0x{:x}", from_or_to))
        .bind(pagination.page_size)
        .bind(pagination.offset())
        .map(|row| Tx::try_from(&row).unwrap())
        .fetch_all(self.pool())
        .await?;

        let total: u32 = sqlx::query(
            r#"
            SELECT COUNT(*) as total
            FROM transactions
            WHERE chain_id = ?
            AND (from_address = ? or to_address = ?) COLLATE NOCASE
            "#,
        )
        .bind(chain_id)
        .bind(format!("0x{:x}", from_or_to))
        .bind(format!("0x{:x}", from_or_to))
        .map(|row| row.get("total"))
        .fetch_one(self.pool())
        .await?;

        Ok(Paginated::new(items, pagination, total))
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

    pub async fn get_native_balance(&self, chain_id: u32, address: Address) -> U256 {
        let res: U256 = sqlx::query(
            r#" SELECT balance
            FROM native_balances
            WHERE chain_id = ? AND owner = ? "#,
        )
        .bind(chain_id)
        .bind(format!("0x{:x}", address))
        .map(|row| U256::from_dec_str(row.get::<&str, _>("balance")).unwrap())
        .fetch_one(self.pool())
        .await
        .unwrap_or_default();

        res
    }

    pub async fn get_erc20_balances(
        &self,
        chain_id: u32,
        address: Address,
    ) -> Result<Vec<TokenBalance>> {
        let res: Vec<_> = sqlx::query(
            r#"SELECT balances.contract, balances.balance, meta.decimals, meta.name, meta.symbol
            FROM balances
            LEFT JOIN tokens_metadata AS meta
              ON meta.chain_id = balances.chain_id AND meta.contract = balances.contract
            WHERE balances.chain_id = ? AND balances.owner = ? "#,
        )
        .bind(chain_id)
        .bind(format!("0x{:x}", address))
        .map(|row| row.try_into().unwrap())
        .fetch_all(self.pool())
        .await?;

        Ok(res)
    }

    pub async fn get_erc20_missing_metadata(&self, chain_id: u32) -> Result<Vec<Address>> {
        let res: Vec<_> = sqlx::query(
            r#"SELECT DISTINCT balances.contract
        FROM balances
        LEFT JOIN tokens_metadata AS meta
          ON meta.chain_id = balances.chain_id AND meta.contract = balances.contract
        WHERE balances.chain_id = ? AND meta.chain_id IS NULL"#,
        )
        .bind(chain_id)
        .map(|row| Address::from_str(row.get::<&str, _>("contract")).unwrap())
        .fetch_all(self.pool())
        .await?;

        Ok(res)
    }

    pub async fn get_erc721_tokens(
        &self,
        chain_id: u32,
        owner: Address,
    ) -> Result<Vec<Erc721Token>> {
        let res: Vec<Erc721Token> = sqlx::query(
            r#" SELECT *
        FROM erc721_tokens
        WHERE chain_id = ? AND owner = ?"#,
        )
        .bind(chain_id)
        .bind(format!("0x{:x}", owner))
        .map(|row| row.try_into().unwrap())
        .fetch_all(self.pool())
        .await?;

        Ok(res)
    }

    pub async fn get_erc721_collections(
        &self,
        chain_id: u32,
        address: Address,
    ) -> Result<Vec<Erc721Collection>> {
        let res: Vec<Erc721Collection> = sqlx::query(
            r#" SELECT *
        FROM erc721_collections
        WHERE contract IN (SELECT DISTINCT contract FROM erc721_tokens WHERE owner = ? AND chain_id =?)"#,
        )
        .bind(format!("0x{:x}", address))
        .bind(chain_id)
        .map(|row| row.try_into().unwrap())
        .fetch_all(self.pool())
        .await?;

        Ok(res)
    }

    pub async fn get_erc721_missing_data(&self, chain_id: u32) -> Result<Vec<Erc721Token>> {
        let res: Vec<_> = sqlx::query(
            r#"SELECT *
        FROM erc721_tokens
        WHERE chain_id = ? AND uri IS NULL"#,
        )
        .bind(chain_id)
        .map(|row| row.try_into().unwrap())
        .fetch_all(self.pool())
        .await?;

        Ok(res)
    }

    pub async fn save_erc721_data(
        &self,
        address: Address,
        chain_id: u32,
        token_id: U256,
        owner: Address,
        name: String,
        symbol: String,
        uri: String,
        metadata: String,
    ) -> Result<()> {
        let mut conn = self.tx().await?;
        queries::update_erc721(address, chain_id, token_id, owner, uri, metadata)
            .execute(&mut conn)
            .await?;

        queries::update_erc721collection(address, chain_id, name, symbol)
            .execute(&mut conn)
            .await?;

        conn.commit().await?;
        Ok(())
    }

    pub async fn get_tip(&self, chain_id: u32, addr: Address) -> Result<u64> {
        let tip = queries::get_tip(addr, chain_id)
            .fetch_one(self.pool())
            .await
            .unwrap_or_default();

        Ok(tip)
    }

    #[instrument(skip(self), level = "trace")]
    pub async fn set_tip(&self, chain_id: u32, addr: Address, tip: u64) -> Result<()> {
        queries::set_tip(addr, chain_id, tip)
            .execute(self.pool())
            .await?;

        Ok(())
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

        sqlx::query("DELETE FROM erc721_tokens WHERE chain_id = ?")
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

        sqlx::migrate!("../../migrations/").run(&pool).await?;

        Ok(())
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StoredContract {
    address: Address,
    deployed_code_hash: String,
}
