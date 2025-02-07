use std::{path::PathBuf, sync::Arc};

use ethui_broadcast::InternalMsg;
use once_cell::sync::OnceCell;

use crate::{Db, DbInner, Result};

static DB: OnceCell<Db> = OnceCell::new();

pub async fn init(path: &PathBuf) -> Result<Db> {
    let db = Arc::new(DbInner::connect(path).await.unwrap());
    DB.set(db.clone()).unwrap();

    tokio::spawn(async { receiver().await });

    Ok(db)
}

pub fn get() -> Db {
    DB.get().unwrap().clone()
}

async fn receiver() -> ! {
    let mut rx = ethui_broadcast::subscribe_internal().await;

    loop {
        if let Ok(msg) = rx.recv().await {
            use InternalMsg::*;

            if let NetworkRemoved(chain_id) = msg {
                let _ = get().remove_contracts(chain_id).await;
                let _ = get().remove_transactions(chain_id).await;
            }
        }
    }
}
