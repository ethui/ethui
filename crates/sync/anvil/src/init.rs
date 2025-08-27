use ethui_broadcast::InternalMsg;
use tracing::trace;

use crate::tracker;

pub fn init() {
    tokio::spawn(async { receiver().await });
}

async fn receiver() -> ! {
    let mut rx = ethui_broadcast::subscribe_internal().await;

    loop {
        match rx.recv().await {
            Ok(InternalMsg::NetworkAdded(network))
            | Ok(InternalMsg::NetworkUpdated(network))
            | Ok(InternalMsg::NetworkRemoved(network))
                if network.is_dev().await =>
            {
                trace!(
                    "resetting anvil listener for chain_id {} {}",
                    network.chain_id(),
                    network.dedup_chain_id.dedup_id()
                );
                tracker::unwatch(&network).await;
                tracker::watch(&network).await;
            }
            _ => (),
        }
    }
}
