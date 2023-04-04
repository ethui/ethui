use async_trait::async_trait;
use sqlx::sqlite::SqliteRow;
use sqlx::Row;

use crate::db::DB;
use crate::error::Result;

#[derive(Debug)]
pub struct ListenerState {
    pub chain_id: u32,
    pub last_known_block: u32,
}

impl ListenerState {
    pub fn new(chain_id: u32) -> Self {
        Self {
            chain_id,
            last_known_block: 0,
        }
    }
}

impl TryFrom<SqliteRow> for ListenerState {
    type Error = crate::error::Error;

    fn try_from(value: SqliteRow) -> Result<Self> {
        Ok(Self {
            chain_id: value.try_get("chain_id")?,
            last_known_block: value.try_get("last_known_lock")?,
        })
    }
}

#[async_trait]
pub trait BlockListenerStore {
    async fn get_block_listener_state(&self, chain_id: u32) -> Result<ListenerState>;
    async fn set_block_listener_state(&self, state: &ListenerState) -> Result<()>;
    async fn clear_block_listener_state(&self, chain_id: u32) -> Result<()>;
}

#[async_trait]
impl BlockListenerStore for DB {
    async fn get_block_listener_state(&self, chain_id: u32) -> Result<ListenerState> {
        sqlx::query(
            r#"
            SELECT *
            FROM block
            WHERE chain_id = ?
            "#,
        )
        .bind(chain_id)
        .map(|row: SqliteRow| row.try_into())
        .fetch_one(self.pool())
        .await?
    }

    async fn set_block_listener_state(&self, state: &ListenerState) -> Result<()> {
        sqlx::query(
            r#"
            INSERT INTO block_listeners (chain_id, last_known_block) 
            VALUES (?, ?ON CONFLICT(chain_id) 
            DO UPDATE SET last_known_block = ?
            "#,
        )
        .bind(state.chain_id)
        .bind(state.last_known_block)
        .bind(state.last_known_block)
        .execute(self.pool())
        .await?;

        Ok(())
    }

    async fn clear_block_listener_state(&self, chain_id: u32) -> Result<()> {
        sqlx::query(
            r#"
        DELETE 
        FROM block_listeners
        WHERE chain_id = ?
        "#,
        )
        .bind(chain_id)
        .execute(self.pool())
        .await?;

        Ok(())
    }
}
