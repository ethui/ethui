use std::{
    fs::File,
    io::BufReader,
    path::{Path, PathBuf},
};

use async_trait::async_trait;
use common::GlobalState;
use once_cell::sync::OnceCell;
use serde::Deserialize;
use tokio::sync::{RwLock, RwLockReadGuard, RwLockWriteGuard};

use super::{Wallet, Wallets};

static WALLETS: OnceCell<RwLock<Wallets>> = OnceCell::new();

pub async fn init(pathbuf: PathBuf) {
    let path = Path::new(&pathbuf);

    #[derive(Debug, Deserialize)]
    struct PersistedWallets {
        wallets: Vec<Wallet>,
        #[serde(default)]
        current: usize,
    }

    let mut res: Wallets = if path.exists() {
        let file = File::open(path).unwrap();
        let reader = BufReader::new(file);

        let res: PersistedWallets = serde_json::from_reader(reader).unwrap();

        Wallets {
            wallets: res.wallets,
            current: res.current,
            file: Some(pathbuf),
        }
    } else {
        Wallets {
            wallets: Default::default(),
            current: 0,
            file: Some(pathbuf),
        }
    };

    res.ensure_current();
    res.init_broadcast().await;

    WALLETS.set(RwLock::new(res)).unwrap();
}

#[async_trait]
impl GlobalState for Wallets {
    async fn read<'a>() -> RwLockReadGuard<'a, Self> {
        WALLETS.get().unwrap().read().await
    }

    async fn write<'a>() -> RwLockWriteGuard<'a, Self> {
        WALLETS.get().unwrap().write().await
    }
}
