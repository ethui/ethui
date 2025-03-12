use ethui_broadcast::InternalMsg;
use ethui_settings::Settings;
use ethui_types::GlobalState;

use crate::worker::{Handle, Worker};

pub async fn init() -> crate::Result<()> {
    let handle = Worker::spawn().unwrap();
    let settings = Settings::read().await;

    if let Some(ref path) = settings.inner.abi_watch_path {
        handle.update_roots(vec![path.clone().into()]).await?;
    }

    tokio::spawn(async move { receiver(handle).await });

    Ok(())
}

/// Will listen for new ABI updates, and poll the database for new contracts
/// the work itself is debounced with a 500ms delay, to batch together multiple updates
async fn receiver(handle: Handle) -> ! {
    let mut rx = ethui_broadcast::subscribe_internal().await;

    loop {
        if let Ok(msg) = rx.recv().await {
            match msg {
                InternalMsg::SettingsUpdated => {
                    let settings = Settings::read().await;
                    if let Some(ref path) = settings.inner.abi_watch_path {
                        // TODO: support multiple
                        let _ = handle.update_roots(vec![path.clone().into()]).await;
                    }
                }

                InternalMsg::ContractFound => {
                    handle.contract_found().await.unwrap();
                }
                _ => (),
            }
        }
    }
}
