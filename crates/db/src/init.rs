use std::{path::PathBuf, sync::Arc};

use ethui_broadcast::InternalMsg;
use once_cell::sync::OnceCell;

use crate::{Db, DbInner};

static DB: OnceCell<Db> = OnceCell::new();

pub async fn init(path: &PathBuf) -> color_eyre::Result<Db> {
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

            if let NetworkRemoved(network) = msg {
                let db = get();

                let _ = db
                    .remove_contracts(network.chain_id(), network.dedup_id())
                    .await;
                let _ = db.remove_transactions(network.chain_id()).await;
            }
        }
    }
}
