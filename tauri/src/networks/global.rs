use std::{
    fs::File,
    io::BufReader,
    path::{Path, PathBuf},
};

use async_trait::async_trait;
use once_cell::sync::OnceCell;
use tokio::sync::{mpsc, RwLock, RwLockReadGuard, RwLockWriteGuard};

use super::{network::Network, Networks};
use crate::{app, db::DB, types::GlobalState};

static NETWORKS: OnceCell<RwLock<Networks>> = OnceCell::new();

#[async_trait]
impl GlobalState for Networks {
    /// initializes through the $XDG_CONFIG/iron/wallets.json file
    type Initializer = (PathBuf, mpsc::UnboundedSender<app::Event>, DB);

    async fn init(args: Self::Initializer) {
        let pathbuf = args.0;
        let window_snd = args.1;
        let db = args.2;

        let path = Path::new(&pathbuf);

        let mut res: Self = if path.exists() {
            let file = File::open(path).unwrap();
            let reader = BufReader::new(file);

            let mut res: Self = serde_json::from_reader(reader).unwrap();
            res.file = Some(pathbuf);
            res.window_snd = Some(window_snd);
            res.db = Some(db);
            res
        } else {
            Self {
                networks: Network::default(),
                current: "mainnet".into(),
                file: Some(pathbuf),
                window_snd: Some(window_snd),
                db: Some(db),
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
