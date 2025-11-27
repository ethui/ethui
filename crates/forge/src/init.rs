use ethui_broadcast::InternalMsg;
use ethui_settings::actor::*;
use kameo::{Actor as _, actor::ActorRef};

use crate::actor::{ForgeActor, NewContract, UpdateRoots};

pub async fn init() -> color_eyre::Result<()> {
    let handle = ForgeActor::spawn(());
    handle.register("forge").unwrap();
    let settings = settings()
        .ask(GetAll)
        .await
        .expect("Failed to get settings");

    if let Some(ref path) = settings.abi_watch_path {
        handle
            .tell(UpdateRoots(vec![path.clone().into()]))
            .await?;
    }

    tokio::spawn(async move { receiver(handle).await });

    Ok(())
}

/// Will listen for new ABI updates, and poll the database for new contracts
/// the work itself is debounced with a 500ms delay, to batch together multiple updates
async fn receiver(handle: ActorRef<ForgeActor>) -> ! {
    let mut rx = ethui_broadcast::subscribe_internal().await;

    loop {
        if let Ok(msg) = rx.recv().await {
            match msg {
                InternalMsg::SettingsUpdated => {
                    let settings = settings()
                        .ask(GetAll)
                        .await
                        .expect("Failed to get settings");
                    if let Some(ref path) = settings.abi_watch_path {
                        // TODO: support multiple
                        handle
                            .tell(UpdateRoots(vec![path.clone().into()]))
                            .await
                            .unwrap();
                    }
                }

                InternalMsg::ContractFound => {
                    handle.tell(NewContract).await.unwrap();
                }
                _ => (),
            }
        }
    }
}
