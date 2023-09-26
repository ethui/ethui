use std::collections::HashMap;

use iron_broadcast::InternalMsg;
use iron_db::DB;
use once_cell::sync::{Lazy, OnceCell};
use tokio::sync::Mutex;
use url::Url;

use crate::tracker::Tracker;

static DB: OnceCell<DB> = OnceCell::new();
static LISTENERS: Lazy<Mutex<HashMap<u32, Tracker>>> = Lazy::new(Default::default);

pub fn init(db: DB) {
    DB.set(db).unwrap();
    tokio::spawn(async { receiver().await });
}

async fn receiver() -> ! {
    let mut rx = iron_broadcast::subscribe_internal().await;

    loop {
        if let Ok(InternalMsg::ResetAnvilListener { chain_id, http, ws }) = rx.recv().await {
            reset_listener(chain_id, http, ws).await
        }
    }
}

async fn reset_listener(chain_id: u32, http: Url, ws: Url) {
    LISTENERS.lock().await.remove(&chain_id);

    let listener = Tracker::run(chain_id, http, ws, DB.get().unwrap().clone());

    LISTENERS.lock().await.insert(chain_id, listener);
}
