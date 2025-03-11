#![allow(dead_code)]

use std::{path::PathBuf, sync::OnceLock, time::Duration};

use ethui_broadcast::InternalMsg;
use ethui_settings::Settings;
use ethui_types::GlobalState;
use once_cell::sync::Lazy;
use tokio::{sync::RwLock, time};

use crate::{
    manager::Forge,
    root_paths_watcher::{self, Watcher},
    utils,
};

pub(crate) static FORGE: Lazy<RwLock<Forge>> = Lazy::new(Default::default);
pub(crate) static FORGE2: OnceLock<root_paths_watcher::Handle> = OnceLock::new(); // =
                                                                                  //Lazy::new(|| RwLock::new(RootPathsWatcher::new().unwrap()));

pub async fn init() -> crate::Result<()> {
    let watcher = Watcher::spawn().unwrap();
    FORGE2.get_or_init(|| watcher);
    //tokio::spawn(async { receiver().await });
    //tokio::spawn(async { worker().await });

    let settings = Settings::read().await;
    //let mut forge = FORGE.write().await;
    let forge2 = FORGE2.get().unwrap();

    if let Some(ref path) = settings.inner.abi_watch_path {
        //forge.watch(path.clone().into()).await?;
        forge2.update_roots(vec![path.clone().into()]).await?;
    }

    Ok(())
}

async fn receiver() -> ! {
    let mut rx = ethui_broadcast::subscribe_internal().await;

    loop {
        if let Ok(msg) = rx.recv().await {
            use InternalMsg::*;

            if let SettingsUpdated = msg {
                let settings = Settings::read().await;
                let forge2 = FORGE2.get().unwrap();

                let new_path: Option<PathBuf> =
                    settings.inner.abi_watch_path.clone().map(Into::into);

                // if path didn't change, skip
                if let Some(path) = new_path {
                    // TODO: support multiple
                    let _ = forge2.update_roots(vec![path]).await;
                }
                //if forge.watch_path.first().eq(&new_path.as_ref()) {
                //    continue;
                //}

                //if let Some(path) = new_path.clone() {
                //    let _ = forge.watch(path).await;
                //} else {
                //    let _ = forge.unwatch().await;
                //}
            }
        }
    }
}

/// Will listen for new ABI updates, and poll the database for new contracts
/// the work itself is debounced with a 500ms delay, to batch together multiple updates
async fn worker() -> ! {
    let mut rx = ethui_broadcast::subscribe_internal().await;

    loop {
        if let Ok(msg) = rx.recv().await {
            use InternalMsg::*;

            // trigger an update
            match msg {
                ForgeAbiFound | ContractFound => {
                    // debounce, if there are other messages in the queue, we don't actually care
                    // about them since they'll just trigger a repeated call here
                    rx.resubscribe();
                    utils::update_db_contracts().await.unwrap();
                    time::sleep(Duration::from_secs(1)).await;
                }
                _ => (),
            }
        }
    }
}
