use broadcast::InternalMsg;

use crate::tracker;

pub fn init() {
    tokio::spawn(async { receiver().await });
}

async fn receiver() -> ! {
    let mut rx = broadcast::subscribe_internal().await;

    loop {
        match rx.recv().await {
            Ok(InternalMsg::NetworkRemoved(network)) => {
                tracker::unwatch(&network).await;
            }
            Ok(InternalMsg::NetworkAdded(network)) | Ok(InternalMsg::NetworkUpdated(network))
                if network.is_dev().await =>
            {
                tracker::unwatch(&network).await;
                tracker::watch(&network).await;
            }
            _ => (),
        }
    }
}
