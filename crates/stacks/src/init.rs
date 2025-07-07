use std::path::PathBuf;

use ethui_broadcast::InternalMsg;
use ethui_settings::GetAll;
use kameo::actor::ActorRef;

use crate::actor::{Msg, Worker};

pub async fn init(stacks_port: u16, config_dir: PathBuf) -> color_eyre::Result<()> {
    let handle = kameo::spawn(Worker::new(stacks_port, config_dir));
    handle.register("run_local_stacks").unwrap();

    let settings = ethui_settings::ask(GetAll)
        .await
        .expect("Failed to get settings");

    handle
        .tell(Msg::SetEnabled(settings.run_local_stacks))
        .await?;

    tokio::spawn(async move { receiver(handle).await });

    Ok(())
}

async fn receiver(handle: ActorRef<Worker>) -> ! {
    let mut rx = ethui_broadcast::subscribe_internal().await;

    loop {
        if let Ok(msg) = rx.recv().await {
            match msg {
                InternalMsg::SettingsUpdated => {
                    let settings = ethui_settings::ask(GetAll)
                        .await
                        .expect("Failed to get settings");

                    handle
                        .tell(Msg::SetEnabled(settings.run_local_stacks))
                        .await
                        .unwrap();
                }
                _ => (),
            }
        }
    }
}
