use std::{
    collections::HashMap,
    fs::File,
    io::BufReader,
    path::{Path, PathBuf},
};

use async_trait::async_trait;
use ethui_broadcast::InternalMsg;
use ethui_types::{Affinity, GlobalState};
use once_cell::sync::OnceCell;
use serde::Deserialize;
use tokio::sync::{RwLock, RwLockReadGuard, RwLockWriteGuard};

use crate::store::Store;

static STORE: OnceCell<RwLock<Store>> = OnceCell::new();

pub async fn init(pathbuf: PathBuf) {
    let path = Path::new(&pathbuf);

    #[derive(Debug, Deserialize)]
    struct PersistedStore {
        affinities: HashMap<String, Affinity>,
    }

    let store: Store = if path.exists() {
        let file = File::open(path).unwrap();
        let reader = BufReader::new(file);

        let store: PersistedStore = serde_json::from_reader(reader).unwrap();

        Store {
            affinities: store.affinities,
            file: pathbuf,
        }
    } else {
        Store {
            file: pathbuf,
            ..Default::default()
        }
    };

    STORE.set(RwLock::new(store)).unwrap();

    tokio::spawn(async { receiver().await });
}

#[async_trait]
impl GlobalState for Store {
    async fn read<'a>() -> RwLockReadGuard<'a, Self> {
        STORE.get().unwrap().read().await
    }

    async fn write<'a>() -> RwLockWriteGuard<'a, Self> {
        STORE.get().unwrap().write().await
    }
}

async fn receiver() -> ! {
    let mut rx = ethui_broadcast::subscribe_internal().await;

    loop {
        if let Ok(msg) = rx.recv().await {
            use InternalMsg::*;

            if let NetworkRemoved(network) = msg {
                let mut store = Store::write().await;
                store.on_chain_removed(network.chain_id);
            }
        }
    }
}
