use std::collections::HashMap;

use ethui_broadcast::InternalMsg;
use once_cell::sync::Lazy;
use tokio::sync::Mutex;
use tracing::trace;
use url::Url;

use crate::tracker::Tracker;

static LISTENERS: Lazy<Mutex<HashMap<u32, Tracker>>> = Lazy::new(Default::default);

pub fn init() {
    tokio::spawn(async { receiver().await });
}

async fn receiver() -> ! {
    let mut rx = ethui_broadcast::subscribe_internal().await;

    loop {
        if let Ok(InternalMsg::ResetAnvilListener { chain_id, http, ws }) = rx.recv().await {
            trace!("resetting anvil listener for chain_id {}", chain_id);
            reset_listener(chain_id, http, ws).await
        }
    }
}

async fn reset_listener(chain_id: u32, http: Url, ws: Url) {
    LISTENERS.lock().await.remove(&chain_id);

    let listener = Tracker::run(chain_id, http, ws);

    LISTENERS.lock().await.insert(chain_id, listener);
}
