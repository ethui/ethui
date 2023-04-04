use std::path::PathBuf;

use log::debug;
use sqlx::sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions, SqliteSynchronous};

use crate::{app::DB_PATH, error::Result};

#[derive(Debug, Clone)]
pub struct DB {
    path: PathBuf,
    pub pool: Option<sqlx::Pool<sqlx::Sqlite>>,
}

impl DB {
    pub fn new(path: PathBuf) -> Self {
        Self { path, pool: None }
    }

    pub async fn connect(&mut self) -> Result<()> {
        debug!("Opening database at: {:?}", self.path);
        let connect_options = SqliteConnectOptions::new()
            .filename(&self.path)
            .create_if_missing(true)
            .journal_mode(SqliteJournalMode::Wal)
            .synchronous(SqliteSynchronous::Normal)
            .foreign_keys(true);

        let pool = SqlitePoolOptions::new()
            .connect_with(connect_options)
            .await?;

        debug!("Database opened successfully");
        migrations::run(&pool).await?;

        self.pool = Some(pool);

        Ok(())
    }

    pub fn pool(&self) -> &sqlx::Pool<sqlx::Sqlite> {
        self.pool.as_ref().unwrap()
    }

    pub async fn tx(&self) -> Result<sqlx::Transaction<sqlx::Sqlite>> {
        Ok(self.pool.clone().unwrap().begin().await?)
    }
}

// When instantiating the DB object
// we assume `DB_PATH` has already been filled by the initialized App
//
// This is a helpful way to be able to correctly deserialize the entire context and setup the DB
// connection along the way
impl Default for DB {
    fn default() -> Self {
        Self::new(PathBuf::from(DB_PATH.get().unwrap()))
    }
}

mod migrations {
    use log::debug;
    use sqlx::migrate;

    use crate::error::Result;

    pub async fn run(pool: &sqlx::Pool<sqlx::Sqlite>) -> Result<()> {
        debug!("Running migrations");
        migrate!("../migrations/").run(pool).await?;

        Ok(())
    }
}
