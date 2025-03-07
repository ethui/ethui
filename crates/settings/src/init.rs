use std::path::{Path, PathBuf};

use async_trait::async_trait;
use ethui_broadcast::InternalMsg;
use ethui_types::GlobalState;
use once_cell::sync::OnceCell;
use tokio::sync::{RwLock, RwLockReadGuard, RwLockWriteGuard};

use crate::{migrations::load_and_migrate, Result, SerializedSettings, Settings};

static SETTINGS: OnceCell<RwLock<Settings>> = OnceCell::new();

pub async fn init(pathbuf: PathBuf) -> Result<()> {
    let path = Path::new(&pathbuf);

    let res = if path.exists() {
        load_and_migrate(&pathbuf)
            .await
            .expect("failed to load settings")
    } else {
        Settings {
            inner: SerializedSettings::default(),
            file: pathbuf,
        }
    };

    res.init().await?;
    SETTINGS.set(RwLock::new(res)).unwrap();

    tokio::spawn(async { receiver().await });

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

async fn receiver() -> ! {
    let mut rx = ethui_broadcast::subscribe_internal().await;

    loop {
        match rx.recv().await {
            Ok(InternalMsg::SettingsUpdated) => {
                let mut settings = SETTINGS.get().unwrap().write().await;
                let onboarding = &settings.inner.onboarding;
                if !onboarding.alchemy && settings.inner.alchemy_api_key.is_some() {}
            }
            _ => (),
        }
    }
}
