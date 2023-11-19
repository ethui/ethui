use std::{
    fs::File,
    io::BufReader,
    path::{Path, PathBuf},
};

use async_trait::async_trait;
use iron_types::GlobalState;
use once_cell::sync::OnceCell;
use tokio::sync::{RwLock, RwLockReadGuard, RwLockWriteGuard};

use crate::{Result, SerializedSettings, Settings};

static SETTINGS: OnceCell<RwLock<Settings>> = OnceCell::new();

pub async fn init(pathbuf: PathBuf) -> Result<()> {
    let path = Path::new(&pathbuf);

    let res: Settings = if path.exists() {
        let file = File::open(path).unwrap();
        let reader = BufReader::new(file);

        let inner: SerializedSettings = serde_json::from_reader(reader).unwrap();

        Settings {
            inner,
            file: pathbuf,
        }
    } else {
        Settings {
            inner: SerializedSettings::default(),
            file: pathbuf,
        }
    };

    res.init().await?;
    SETTINGS.set(RwLock::new(res)).unwrap();

    Ok(())
}

#[async_trait]
impl GlobalState for Settings {
    async fn read<'a>() -> RwLockReadGuard<'a, Self> {
        SETTINGS.get().unwrap().read().await
    }

    async fn write<'a>() -> RwLockWriteGuard<'a, Self> {
        SETTINGS.get().unwrap().write().await
    }
}
