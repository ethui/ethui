use std::str::FromStr;

use async_trait::async_trait;
use ethers::{
    abi::AbiEncode,
    types::{Address, U256},
};
use sqlx::{sqlite::SqliteRow, Row};

use super::types::{Event, Events};
use crate::{db::DB, error::Result};

#[async_trait]
pub trait EventsStore {
    async fn save_events<T: Into<Events> + Sized + Send>(
        &self,
        chain_id: u32,
        events: T,
    ) -> Result<()>;

    async fn truncate_events(&self, chain_id: u32) -> Result<()>;

    // TODO: should maybe return Vec<H256> here
    async fn get_transactions(&self, chain_id: u32, from_or_to: Address) -> Result<Vec<String>>;

    // TODO: should maybe return Vec<H256> here
    async fn get_contracts(&self, chain_id: u32) -> Result<Vec<String>>;

    // TODO: should maybe return Vec<(Address, U256)> here
    async fn get_balances(&self, chain_id: u32, address: Address) -> Result<Vec<(Address, U256)>>;
}

#[async_trait]
impl EventsStore for DB {
    async fn save_events<T: Into<Events> + Sized + Send>(
        &self,
        chain_id: u32,
        events: T,
    ) -> Result<()> {
        let mut conn = self.tx().await?;

        for tx in events.into().0.iter() {
            // TODO: report this errors in await?. Currently they're being silently ignored, because the task just gets killed
            match tx {
                Event::Tx(ref tx) => {
                    sqlx::query(
                        r#" INSERT INTO transactions (hash, chain_id, from_address, to_address)
                        VALUES (?,?,?,?)
                        ON CONFLICT(hash) DO NOTHING "#,
                    )
                    .bind(tx.hash.encode_hex())
                    .bind(chain_id)
                    .bind(tx.from.encode_hex())
                    .bind(tx.to.map(AbiEncode::encode_hex))
                    .execute(&mut conn)
                    .await?;
                }

                Event::ContractDeployed(ref tx) => {
                    sqlx::query(
                        r#" INSERT INTO contracts (address, chain_id)
                        VALUES (?,?)
                        ON CONFLICT(address, chain_id) DO NOTHING "#,
                    )
                    .bind(tx.address.encode_hex())
                    .bind(chain_id)
                    .execute(&mut conn)
                    .await?;
                }

                // TODO: what to do if we don't know this contract, and don't have balances yet? (e.g. in a fork)
                Event::ERC20Transfer(transfer) => {
                    // update from's balance
                    if !transfer.from.is_zero() {
                        let current = sqlx::query(r#"SELECT balance FROM balances WHERE chain_id = ? AND contract = ? AND owner = ?"#)
                            .bind(chain_id)
                            .bind(transfer.contract.encode_hex())
                            .bind(transfer.from.encode_hex())
                            .map(|r: SqliteRow|U256::from_dec_str(r.get::<&str,_>("balance")).unwrap())
                            .fetch_one(&mut conn)
                        .await?;

                        sqlx::query(
                            r#" INSERT OR REPLACE INTO balances (chain_id, contract, owner, balance) 
                        VALUES (?,?,?,?) "#,
                        )
                            .bind(chain_id)
                            .bind(transfer.contract.encode_hex())
                            .bind(transfer.from.encode_hex())
                            .bind((current - transfer.value).to_string())
                            .execute(&mut conn)
                        .await?;
                    }

                    // update to's balance
                    if !transfer.to.is_zero() {
                        let current = sqlx::query(r#"SELECT balance FROM balances WHERE chain_id = ? AND contract = ? AND owner = ?"#)
                            .bind(chain_id)
                            .bind(transfer.contract.encode_hex())
                            .bind(transfer.to.encode_hex())
                            .map(|r: SqliteRow|U256::from_dec_str(r.get::<&str,_>("balance")).unwrap())
                            .fetch_one(&mut conn)
                            .await.unwrap_or(U256::zero());

                        sqlx::query(
                            r#" INSERT OR REPLACE INTO balances (chain_id, contract, owner, balance) 
                        VALUES (?,?,?,?) "#,
                        )
                            .bind(chain_id)
                            .bind(transfer.contract.encode_hex())
                            .bind(transfer.to.encode_hex())
                            .bind((current + transfer.value).to_string())
                            .execute(&mut conn)
                        .await?;
                    }
                }

                Event::ERC721Transfer(transfer) => {
                    if !transfer.to.is_zero() {
                        sqlx::query(
                            r#" DELETE FROM nft_tokens WHERE chain_id = ? AND contract = ? AND token_id = ? "#,
                        )
                            .bind(chain_id)
                            .bind(transfer.contract.encode_hex())
                            .bind(transfer.token_id.encode_hex())
                            .execute(&mut conn)
                        .await?;
                    } else {
                        sqlx::query(
                            r#" INSERT INTO nft_tokens (chain_id, contract, token_id, owner)
                            VALUES (?,?,?,?) "#,
                        )
                        .bind(chain_id)
                        .bind(transfer.contract.encode_hex())
                        .bind(transfer.token_id.encode_hex())
                        .bind(transfer.to.encode_hex())
                        .execute(&mut conn)
                        .await?;
                    }
                }
            }
        }
        conn.commit().await?;
        Ok(())
    }

    async fn get_transactions(&self, chain_id: u32, from_or_to: Address) -> Result<Vec<String>> {
        let res: Vec<_> = sqlx::query(
            r#" SELECT * 
            FROM transactions 
            WHERE chain_id = ? 
            AND (from_address = ? or to_address = ?) COLLATE NOCASE "#,
        )
        .bind(chain_id)
        .bind(from_or_to.encode_hex())
        .bind(from_or_to.encode_hex())
        .map(|row| row.get("hash"))
        .fetch_all(self.pool())
        .await?;

        Ok(res)
    }

    async fn get_contracts(&self, chain_id: u32) -> Result<Vec<String>> {
        let res: Vec<_> = sqlx::query(
            r#" SELECT * 
            FROM contracts
            WHERE chain_id = ? "#,
        )
        .bind(chain_id)
        .map(|row| row.get("address"))
        .fetch_all(self.pool())
        .await?;

        Ok(res)
    }

    async fn get_balances(&self, chain_id: u32, address: Address) -> Result<Vec<(Address, U256)>> {
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

    async fn truncate_events(&self, chain_id: u32) -> Result<()> {
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
}
