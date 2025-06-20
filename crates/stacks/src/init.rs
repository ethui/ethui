use ethui_broadcast::InternalMsg;
use ethui_settings::Settings;
use ethui_types::GlobalState;
use kameo::actor::ActorRef;

use crate::actor::{Msg, Worker};

pub async fn init() -> crate::Result<()> {
    let handle = kameo::spawn(Worker::default());
    handle.register("stacks").unwrap();

    // Set initial state from settings
    let settings = Settings::read().await;
    handle.tell(Msg::SetStacks(settings.stacks())).await?;

    tokio::spawn(async move { receiver(handle).await });

    Ok(())
}

async fn receiver(handle: ActorRef<Worker>) -> ! {
    let mut rx = ethui_broadcast::subscribe_internal().await;

    loop {
        if let Ok(msg) = rx.recv().await {
            match msg {
                InternalMsg::SettingsUpdated => {
                    let settings = Settings::read().await;
                    handle
                        .tell(Msg::SetStacks(settings.stacks()))
                        .await
                        .unwrap();
                }
                _ => (),
            }
        }
    }
}
