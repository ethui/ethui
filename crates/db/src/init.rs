use once_cell::sync::OnceCell;
use std::path::PathBuf;
use std::sync::Arc;

use crate::{Db, DbInner, Result};

static DB: OnceCell<Db> = OnceCell::new();

pub async fn init(path: &PathBuf) -> Result<Db> {
    let db = Arc::new(DbInner::connect(path).await.unwrap());
    DB.set(db.clone()).unwrap();
    Ok(db)
}

pub fn get() -> Db {
    DB.get().unwrap().clone()
}
