use iron_settings::Settings;
use iron_types::GlobalState;

use crate::Forge;

pub async fn init() -> crate::Result<()> {
    let settings = Settings::read().await;

    if let (true, Some(path)) = (
        settings.inner.abi_watch,
        settings.inner.abi_watch_path.clone(),
    ) {
        Forge::watch(path).await
    } else {
        Ok(())
    }
}
