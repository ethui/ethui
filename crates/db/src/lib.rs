pub mod commands;
mod init;
mod pagination;
mod queries;
pub mod utils;

use std::{path::PathBuf, sync::Arc};

use ethui_types::NetworkId;
pub use init::{get, init};
use sqlx::sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions, SqliteSynchronous};

#[derive(Debug, Clone)]
pub struct DbInner {
    pub pool: sqlx::Pool<sqlx::Sqlite>,
}
pub type Db = Arc<DbInner>;

impl DbInner {
    pub async fn connect(path: &PathBuf) -> color_eyre::Result<Self> {
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

    pub async fn truncate_events(&self, dedup_chain_id: NetworkId) -> color_eyre::Result<()> {
        let chain_id = dedup_chain_id.chain_id();
        let dedup_id = dedup_chain_id.dedup_id();
        sqlx::query!(r#"DELETE FROM transactions WHERE chain_id = ?"#, chain_id)
            .execute(self.pool())
            .await?;

        sqlx::query!(
            r#"DELETE FROM contracts WHERE chain_id = ? AND dedup_id = ?"#,
            chain_id,
            dedup_id
        )
        .execute(self.pool())
        .await?;

        sqlx::query!(r#"DELETE FROM balances WHERE chain_id = ?"#, chain_id)
            .bind(chain_id)
            .execute(self.pool())
            .await?;

        sqlx::query!(
            r#"DELETE FROM tokens_metadata WHERE chain_id = ?"#,
            chain_id
        )
        .bind(chain_id)
        .execute(self.pool())
        .await?;

        Ok(())
    }

    pub fn pool(&self) -> &sqlx::Pool<sqlx::Sqlite> {
        &self.pool
    }

    pub async fn tx(&self) -> color_eyre::Result<sqlx::Transaction<'_, sqlx::Sqlite>> {
        Ok(self.pool.clone().begin().await?)
    }

    async fn migrate(&self) -> color_eyre::Result<()> {
        let pool = self.pool.clone();

        sqlx::migrate!("../../migrations/").run(&pool).await?;

        Ok(())
    }
}
