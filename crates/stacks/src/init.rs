use std::path::PathBuf;

use ethui_broadcast::InternalMsg;
use ethui_settings::GetAll;
use kameo::actor::ActorRef;

use crate::actor::{CreateStack, Initializing, RemoveStack, SetEnabled, Worker};

pub async fn init(stacks_port: u16, config_dir: PathBuf) -> color_eyre::Result<()> {
    let handle = kameo::spawn(Worker::new(stacks_port, config_dir)?);
    handle.register("run_local_stacks")?;

    let settings = ethui_settings::ask(GetAll)
        .await
        .expect("Failed to get settings");

    dbg!(handle.tell(Initializing()).await?);
    handle.tell(SetEnabled(settings.run_local_stacks)).await?;

    tokio::spawn(async move { receiver(handle).await });

    Ok(())
}

async fn receiver(handle: ActorRef<Worker>) -> ! {
    let mut rx = ethui_broadcast::subscribe_internal().await;

    loop {
        if let Ok(msg) = rx.recv().await
            && let InternalMsg::SettingsUpdated = msg
        {
            let settings = ethui_settings::ask(GetAll)
                .await
                .expect("Failed to get settings");

            if let Err(e) = handle.tell(SetEnabled(settings.run_local_stacks)).await {
                tracing::error!("Failed to send stacks actor SetEnabled message: {}", e);
            }
        }
    }
}
