use iron_broadcast::InternalMsg;
use iron_settings::Settings;
use iron_types::GlobalState;

use crate::FORGE;

pub async fn init() -> crate::Result<()> {
    tokio::spawn(async { receiver().await });

    let settings = Settings::read().await;

    let mut forge = FORGE.write().await;
    let _ = forge.start().await;

    if let (true, Some(path)) = (
        settings.inner.abi_watch,
        settings.inner.abi_watch_path.clone(),
    ) {
        forge.watch_path(path.into()).await?;
    }

    Ok(())
}

async fn receiver() -> ! {
    let mut rx = iron_broadcast::subscribe_internal().await;

    // reads current settings
    let (mut enabled, mut path) = {
        let settings = Settings::read().await;

        (
            settings.inner.abi_watch,
            settings.inner.abi_watch_path.clone(),
        )
    };

    loop {
        if let Ok(msg) = rx.recv().await {
            use InternalMsg::*;

            if let SettingsUpdated = msg {
                let settings = Settings::read().await;
                let new_enabled = settings.inner.abi_watch;
                let new_path = settings.inner.abi_watch_path.clone();

                // if nothing changed, skip
                if (enabled, &path) == (new_enabled, &new_path) {
                    continue;
                }

                let mut forge = FORGE.write().await;
                if let (true, Some(path)) = (new_enabled, new_path.clone()) {
                    let _ = forge.watch_path(path.into()).await;
                } else {
                    let _ = forge.unwatch().await;
                }

                enabled = new_enabled;
                path = new_path;
            }
        }
    }
}
