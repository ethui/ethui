#![allow(dead_code)]

use std::{path::PathBuf, sync::OnceLock};

use ethui_broadcast::InternalMsg;
use ethui_settings::Settings;
use ethui_types::GlobalState;

use crate::root_paths_watcher;

//pub(crate) static FORGE: Lazy<RwLock<Forge>> = Lazy::new(Default::default);
pub(crate) static FORGE2: OnceLock<root_paths_watcher::Handle> = OnceLock::new(); // =
                                                                                  //Lazy::new(|| RwLock::new(RootPathsWatcher::new().unwrap()));

pub async fn init() -> crate::Result<()> {
    let worker = root_paths_watcher::Watcher::spawn().unwrap();

    let settings = Settings::read().await;
    //let mut forge = FORGE.write().await;

    if let Some(ref path) = settings.inner.abi_watch_path {
        //forge.watch(path.clone().into()).await?;
        worker.update_roots(vec![path.clone().into()]).await?;
    }

    tokio::spawn(async move { receiver(worker).await });

    Ok(())
}

/// Will listen for new ABI updates, and poll the database for new contracts
/// the work itself is debounced with a 500ms delay, to batch together multiple updates
async fn receiver(worker: root_paths_watcher::Handle) -> ! {
    let mut rx = ethui_broadcast::subscribe_internal().await;

    loop {
        if let Ok(msg) = rx.recv().await {
            match msg {
                InternalMsg::SettingsUpdated => {
                    let settings = Settings::read().await;
                    let new_path: Option<PathBuf> =
                        settings.inner.abi_watch_path.clone().map(Into::into);
                    if let Some(path) = new_path {
                        // TODO: support multiple
                        let _ = worker.update_roots(vec![path]).await;
                    }
                }

                InternalMsg::ContractFound => {
                    worker.contract_found().await.unwrap();
                }
                _ => (),
            }
        }
    }
}
