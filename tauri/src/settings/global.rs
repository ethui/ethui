use std::{
    fs::File,
    io::BufReader,
    path::{Path, PathBuf},
};

use async_trait::async_trait;
use once_cell::sync::OnceCell;
use tokio::sync::{RwLock, RwLockReadGuard, RwLockWriteGuard};

use super::{SerializedSettings, Settings};
use crate::types::GlobalState;

static SETTINGS: OnceCell<RwLock<Settings>> = OnceCell::new();

#[async_trait]
impl GlobalState for Settings {
    /// initializes through the $XDG_CONFIG/iron/wallets.json file
    type Initializer = PathBuf;

    async fn init(pathbuf: Self::Initializer) {
        let path = Path::new(&pathbuf);

        let res: Self = if path.exists() {
            let file = File::open(path).unwrap();
            let reader = BufReader::new(file);

            let inner: SerializedSettings = serde_json::from_reader(reader).unwrap();

            Self {
                inner,
                file: pathbuf,
            }
        } else {
            Self {
                inner: SerializedSettings::default(),
                file: pathbuf,
            }
        };

        SETTINGS.set(RwLock::new(res)).unwrap();
    }

    async fn read<'a>() -> RwLockReadGuard<'a, Self> {
        SETTINGS.get().unwrap().read().await
    }

    async fn write<'a>() -> RwLockWriteGuard<'a, Self> {
        SETTINGS.get().unwrap().write().await
    }
}
