use std::{
    collections::HashMap,
    fs::File,
    io::BufReader,
    path::{Path, PathBuf},
};

use async_trait::async_trait;
use iron_db::DB;
use iron_types::GlobalState;
use once_cell::sync::OnceCell;
use serde::Deserialize;
use tokio::sync::{mpsc, RwLock, RwLockReadGuard, RwLockWriteGuard};

use super::{network::Network, Networks};
use crate::app;

static NETWORKS: OnceCell<RwLock<Networks>> = OnceCell::new();

#[async_trait]
impl GlobalState for Networks {
    /// initializes through the $XDG_CONFIG/iron/wallets.json file
    type Initializer = (PathBuf, mpsc::UnboundedSender<app::Event>, DB);

    async fn init(args: Self::Initializer) {
        let pathbuf = args.0;
        let window_snd = args.1;
        let db = args.2;

        /// The persisted format of the networks object
        #[derive(Debug, Deserialize)]
        struct PersistedNetworks {
            pub current: String,
            pub networks: HashMap<String, Network>,
        }

        let path = Path::new(&pathbuf);

        let mut res: Self = if path.exists() {
            let file = File::open(path).unwrap();
            let reader = BufReader::new(file);

            let res: PersistedNetworks = serde_json::from_reader(reader).unwrap();

            Self {
                networks: res.networks,
                current: res.current,
                file: pathbuf,
                window_snd,
                db,
            }
        } else {
            let networks = Network::all_default();
            let current = networks[0].name.clone();
            Self {
                networks: networks.into_iter().map(|n| (n.name.clone(), n)).collect(),
                current,
                file: pathbuf,
                window_snd,
                db,
            }
        };

        res.reset_listeners();

        NETWORKS.set(RwLock::new(res)).unwrap();
    }

    async fn read<'a>() -> RwLockReadGuard<'a, Self> {
        NETWORKS.get().unwrap().read().await
    }

    async fn write<'a>() -> RwLockWriteGuard<'a, Self> {
        NETWORKS.get().unwrap().write().await
    }
}
