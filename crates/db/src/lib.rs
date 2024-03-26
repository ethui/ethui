pub mod commands;
mod error;
mod init;
mod pagination;
mod queries;
pub mod utils;

use std::{path::PathBuf, sync::Arc};

pub use init::{get, init};
use sqlx::sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions, SqliteSynchronous};

pub use self::{
    error::{Error, Result},
    pagination::{Paginated, Pagination},
};

#[derive(Debug, Clone)]
pub struct DbInner {
    pub pool: sqlx::Pool<sqlx::Sqlite>,
}
pub type Db = Arc<DbInner>;

impl DbInner {
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

    pub async fn truncate_events(&self, chain_id: u32) -> Result<()> {
        sqlx::query!(r#"DELETE FROM transactions WHERE chain_id = ?"#, chain_id)
            .execute(self.pool())
            .await?;

        sqlx::query!(r#"DELETE FROM contracts WHERE chain_id = ?"#, chain_id)
            .execute(self.pool())
            .await?;

        sqlx::query!(r#"DELETE FROM balances WHERE chain_id = ?"#, chain_id)
            .bind(chain_id)
            .execute(self.pool())
            .await?;

        sqlx::query!(r#"DELETE FROM erc721_tokens WHERE chain_id = ?"#, chain_id)
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
