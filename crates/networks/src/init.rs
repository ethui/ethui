use std::{
    collections::HashMap,
    fs::File,
    io::BufReader,
    path::{Path, PathBuf},
};

use async_trait::async_trait;
use iron_types::{GlobalState, UISender};
use once_cell::sync::OnceCell;
use serde::Deserialize;
use tokio::sync::{RwLock, RwLockReadGuard, RwLockWriteGuard};

use super::{network::Network, Networks};

static NETWORKS: OnceCell<RwLock<Networks>> = OnceCell::new();

pub async fn init(pathbuf: PathBuf, window_snd: UISender) {
    /// The persisted format of the networks object
    #[derive(Debug, Deserialize)]
    struct PersistedNetworks {
        pub current: String,
        pub networks: HashMap<String, Network>,
    }

    let path = Path::new(&pathbuf);

    let mut res: Networks = if path.exists() {
        let file = File::open(path).unwrap();
        let reader = BufReader::new(file);

        let res: PersistedNetworks = serde_json::from_reader(reader).unwrap();

        Networks {
            networks: res.networks,
            current: res.current,
            file: pathbuf,
            window_snd,
        }
    } else {
        let networks = Network::all_default();
        let current = networks[0].name.clone();
        Networks {
            networks: networks.into_iter().map(|n| (n.name.clone(), n)).collect(),
            current,
            file: pathbuf,
            window_snd,
        }
    };

    res.reset_listeners().await;

    NETWORKS.set(RwLock::new(res)).unwrap();
}

#[async_trait]
impl GlobalState for Networks {
    async fn read<'a>() -> RwLockReadGuard<'a, Self> {
        NETWORKS.get().unwrap().read().await
    }

    async fn write<'a>() -> RwLockWriteGuard<'a, Self> {
        NETWORKS.get().unwrap().write().await
    }
}
