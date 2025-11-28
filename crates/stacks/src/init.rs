use std::path::PathBuf;

use ethui_broadcast::InternalMsg;
use ethui_settings::{SettingsActorExt as _, settings};
use kameo::{Actor as _, actor::ActorRef};

use crate::actor::{StacksActor, StacksActorExt as _};

pub async fn init(stacks_port: u16, config_dir: PathBuf) -> color_eyre::Result<()> {
    let handle = StacksActor::spawn((stacks_port, config_dir));
    handle.register("stacks")?;

    let settings = settings()
        .get_all()
        .await
        .expect("Failed to get settings");

    handle.initialize().await?;
    handle.set_enabled(settings.run_local_stacks).await?;

    tokio::spawn(async move { receiver(handle).await });

    Ok(())
}

async fn receiver(handle: ActorRef<StacksActor>) -> ! {
    let mut rx = ethui_broadcast::subscribe_internal().await;

    loop {
        if let Ok(msg) = rx.recv().await
            && let InternalMsg::SettingsUpdated = msg
        {
            let settings = settings()
                .get_all()
                .await
                .expect("Failed to get settings");

            if let Err(e) = handle.set_enabled(settings.run_local_stacks).await {
                tracing::error!("Failed to send stacks actor SetEnabled message: {}", e);
            }
        }
    }
}
