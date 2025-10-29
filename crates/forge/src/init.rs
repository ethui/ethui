use ethui_broadcast::InternalMsg;
use ethui_settings::GetAll;
use kameo::{Actor as _, actor::ActorRef};

use crate::actor::{Msg, Worker};

pub async fn init() -> color_eyre::Result<()> {
    let handle = Worker::spawn(());
    handle.register("forge").unwrap();
    let settings = ethui_settings::ask(GetAll)
        .await
        .expect("Failed to get settings");

    if let Some(ref path) = settings.abi_watch_path {
        handle
            .tell(Msg::UpdateRoots(vec![path.clone().into()]))
            .await?;
    }

    tokio::spawn(async move { receiver(handle).await });

    Ok(())
}

/// Will listen for new ABI updates, and poll the database for new contracts
/// the work itself is debounced with a 500ms delay, to batch together multiple updates
async fn receiver(handle: ActorRef<Worker>) -> ! {
    let mut rx = ethui_broadcast::subscribe_internal().await;

    loop {
        if let Ok(msg) = rx.recv().await {
            match msg {
                InternalMsg::SettingsUpdated => {
                    let settings = ethui_settings::ask(GetAll)
                        .await
                        .expect("Failed to get settings");
                    if let Some(ref path) = settings.abi_watch_path {
                        // TODO: support multiple
                        handle
                            .tell(Msg::UpdateRoots(vec![path.clone().into()]))
                            .await
                            .unwrap();
                    }
                }

                InternalMsg::ContractFound => {
                    handle.tell(Msg::NewContract).await.unwrap();
                }
                _ => (),
            }
        }
    }
}
