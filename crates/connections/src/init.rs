use std::path::{Path, PathBuf};

use async_trait::async_trait;
use ethui_broadcast::InternalMsg;
use ethui_types::GlobalState;
use once_cell::sync::OnceCell;
use tokio::sync::{RwLock, RwLockReadGuard, RwLockWriteGuard};

use crate::{migrations::load_and_migrate, store::Store};

static STORE: OnceCell<RwLock<Store>> = OnceCell::new();

pub async fn init(pathbuf: PathBuf) {
    let path = Path::new(&pathbuf);

    let store: Store = if path.exists() {
        load_and_migrate(&pathbuf).expect("failed to load connections")
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
                store.on_chain_removed(network.id());
            }
        }
    }
}
