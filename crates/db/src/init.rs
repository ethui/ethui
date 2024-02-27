use once_cell::sync::OnceCell;
use std::path::PathBuf;

use crate::{Db, Result};

static DB: OnceCell<Db> = OnceCell::new();

pub async fn init(path: &PathBuf) -> Result<Db> {
    let db = Db::connect(&path).await.unwrap();
    DB.set(db.clone()).unwrap();
    Ok(db)
}

pub fn get() -> Db {
    DB.get().unwrap().clone()
}
