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
        match rx.recv().await {
            Ok(InternalMsg::NetworkAdded(network))
            | Ok(InternalMsg::NetworkUpdated(network))
            | Ok(InternalMsg::NetworkRemoved(network)) => {
                if network.is_dev().await {
                    trace!("resetting anvil listener for chain_id {}", network.chain_id);
                    reset_listener(network.chain_id, network.clone().http_url, network.ws_url())
                        .await
                }
            }
            _ => (),
        }
    }
}

async fn reset_listener(chain_id: u32, http: Url, ws: Url) {
    LISTENERS.lock().await.remove(&chain_id);

    let listener = Tracker::run(chain_id, http, ws);

    LISTENERS.lock().await.insert(chain_id, listener);
}
