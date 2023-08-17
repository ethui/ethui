use std::{
    collections::HashMap,
    fs::File,
    io::BufReader,
    path::{Path, PathBuf},
};

use async_trait::async_trait;
use iron_types::{Affinity, GlobalState};
use once_cell::sync::OnceCell;
use serde::Deserialize;
use tokio::sync::{RwLock, RwLockReadGuard, RwLockWriteGuard};

use crate::store::RpcStore;

static STORE: OnceCell<RwLock<RpcStore>> = OnceCell::new();

pub async fn init(pathbuf: PathBuf) {
    let path = Path::new(&pathbuf);

    #[derive(Debug, Deserialize)]
    struct PersistedStore {
        affinities: HashMap<String, Affinity>,
    }

    let store: RpcStore = if path.exists() {
        let file = File::open(path).unwrap();
        let reader = BufReader::new(file);

        let store: PersistedStore = serde_json::from_reader(reader).unwrap();

        RpcStore {
            affinities: store.affinities,
            file: pathbuf,
        }
    } else {
        RpcStore {
            file: pathbuf,
            ..Default::default()
        }
    };

    STORE.set(RwLock::new(store)).unwrap();
}

#[async_trait]
impl GlobalState for RpcStore {
    async fn read<'a>() -> RwLockReadGuard<'a, Self> {
        STORE.get().unwrap().read().await
    }

    async fn write<'a>() -> RwLockWriteGuard<'a, Self> {
        STORE.get().unwrap().write().await
    }
}
