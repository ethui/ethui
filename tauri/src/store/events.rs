use async_trait::async_trait;
use ethers::types::Address;
use sqlx::Row;

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
                    dbg!(format!("0x{:x}", tx.from));
                    sqlx::query(
                        r#" INSERT INTO transactions (hash, chain_id, from_address, to_address)
                    VALUES (?,?,?,?)
                    ON CONFLICT(hash) DO NOTHING "#,
                    )
                    .bind(format!("0x{:x}", tx.hash))
                    .bind(chain_id)
                    .bind(format!("0x{:x}", tx.from))
                    .bind(tx.to.map(|a| format!("0x{:x}", a)))
                    .execute(&mut conn)
                    .await?;
                }

                Event::ContractDeployed(ref tx) => {
                    sqlx::query(
                        r#" INSERT INTO contracts (address, chain_id)
                    VALUES (?,?)
                    ON CONFLICT(address, chain_id) DO NOTHING "#,
                    )
                    .bind(format!("0x{:x}", tx.address))
                    .bind(chain_id)
                    .execute(&mut conn)
                    .await?;
                }
                _ => {}
            }
        }
        conn.commit().await?;
        Ok(())
    }

    async fn get_transactions(&self, chain_id: u32, from_or_to: Address) -> Result<Vec<String>> {
        let res: Vec<String> = sqlx::query(
            r#" SELECT * 
            FROM transactions 
            WHERE chain_id = ? 
            AND (from_address = ? or to_address = ?) COLLATE NOCASE "#,
        )
        .bind(chain_id)
        .bind(format!("0x{:x}", from_or_to))
        .bind(format!("0x{:x}", from_or_to))
        .map(|row| row.get("hash"))
        .fetch_all(self.pool())
        .await?;

        Ok(res)
    }

    async fn get_contracts(&self, chain_id: u32) -> Result<Vec<String>> {
        let res: Vec<String> = sqlx::query(
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

    async fn truncate_events(&self, chain_id: u32) -> Result<()> {
        sqlx::query("DELETE FROM transactions WHERE chain_id = ?")
            .bind(chain_id)
            .execute(self.pool())
            .await?;

        sqlx::query("DELETE FROM contracts WHERE chain_id = ?")
            .bind(chain_id)
            .execute(self.pool())
            .await?;

        Ok(())
    }
}
