use std::path::PathBuf;

use log::debug;
use sqlx::sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions, SqliteSynchronous};

use crate::error::Result;

#[derive(Debug)]
pub struct DB(sqlx::Pool<sqlx::Sqlite>);

impl DB {
    pub async fn try_new(db_path: PathBuf) -> Result<Self> {
        debug!("Opening database at: {:?}", db_path);
        let connect_options = SqliteConnectOptions::new()
            .filename(db_path)
            .create_if_missing(true)
            .journal_mode(SqliteJournalMode::Wal)
            .synchronous(SqliteSynchronous::Normal)
            .foreign_keys(true);

        let db = SqlitePoolOptions::new()
            .connect_with(connect_options)
            .await?;

        debug!("Database opened successfully");
        migrations::run(&db).await?;
        Ok(Self(db))
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
