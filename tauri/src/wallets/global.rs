use std::{
    fs::File,
    io::BufReader,
    path::{Path, PathBuf},
};

use async_trait::async_trait;
use once_cell::sync::OnceCell;
use tokio::sync::{RwLock, RwLockReadGuard, RwLockWriteGuard};

use super::Wallets;
use crate::types::GlobalState;

static WALLETS: OnceCell<RwLock<Wallets>> = OnceCell::new();

#[async_trait]
impl GlobalState for Wallets {
    /// initializes through the $XDG_CONFIG/iron/wallets.json file
    type Initializer = PathBuf;

    async fn init(pathbuf: Self::Initializer) {
        let path = Path::new(&pathbuf);

        let mut res: Self = if path.exists() {
            let file = File::open(path).unwrap();
            let reader = BufReader::new(file);

            let mut res: Self = serde_json::from_reader(reader).unwrap();
            res.file = Some(pathbuf);
            res
        } else {
            Self {
                current: 0,
                file: Some(pathbuf),
                ..Default::default()
            }
        };

        res.ensure_current();
        WALLETS.set(RwLock::new(res)).unwrap();
    }

    async fn read<'a>() -> RwLockReadGuard<'a, Self> {
        WALLETS.get().unwrap().read().await
    }

    async fn write<'a>() -> RwLockWriteGuard<'a, Self> {
        WALLETS.get().unwrap().write().await
    }
}
