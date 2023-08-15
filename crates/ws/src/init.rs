use std::{
    collections::HashMap,
    fs::File,
    io::BufReader,
    path::{Path, PathBuf},
};

use async_trait::async_trait;
use iron_broadcast::InternalMsg;
use iron_types::GlobalState;
use once_cell::sync::{Lazy, OnceCell};
use serde::Deserialize;
use tokio::sync::{RwLock, RwLockReadGuard, RwLockWriteGuard};

use crate::{
    peers::{Peers, Store},
    server::server_loop,
};

static PEERS: Lazy<RwLock<Peers>> = Lazy::new(Default::default);
static PEERS_STORE: OnceCell<RwLock<Store>> = OnceCell::new();

pub async fn init(pathbuf: PathBuf) {
    let path = Path::new(&pathbuf);

    #[derive(Debug, Deserialize)]
    struct PersistedStore {
        affinities: HashMap<String, u64>,
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
        Store::default()
    };

    PEERS_STORE.set(RwLock::new(store)).unwrap();

    tokio::spawn(async { server_loop().await });
    tokio::spawn(async { receiver().await });
}

#[async_trait]
impl GlobalState for Peers {
    async fn read<'a>() -> RwLockReadGuard<'a, Self> {
        PEERS.read().await
    }

    async fn write<'a>() -> RwLockWriteGuard<'a, Self> {
        PEERS.write().await
    }
}

#[async_trait]
impl GlobalState for Store {
    async fn read<'a>() -> RwLockReadGuard<'a, Self> {
        PEERS_STORE.get().unwrap().read().await
    }

    async fn write<'a>() -> RwLockWriteGuard<'a, Self> {
        PEERS_STORE.get().unwrap().write().await
    }
}

async fn receiver() -> ! {
    let mut rx = iron_broadcast::subscribe_internal().await;

    loop {
        if let Ok(msg) = rx.recv().await {
            use InternalMsg::*;

            match msg {
                ChainChanged(chain_id, name) => {
                    Peers::read().await.broadcast_chain_changed(chain_id, name)
                }
                AccountsChanged(accounts) => {
                    Peers::read().await.broadcast_accounts_changed(accounts)
                }
                _ => {}
            }
        }
    }
}
