use std::path::PathBuf;

use ethui_broadcast::InternalMsg;
use ethui_settings::Settings;
use ethui_types::GlobalState;
use kameo::actor::ActorRef;

use crate::{
    actor::{Msg, Worker},
    error::Result,
};

pub async fn init(stacks_port: u16, config_dir: PathBuf) -> Result<()> {
    let handle = kameo::spawn(Worker::new(stacks_port, config_dir));
    handle.register("run_local_stacks").unwrap();

    // Set initial state from settings
    let settings = Settings::read().await;

    println!("current run_local_stacks: {}", settings.run_local_stacks());
    handle
        .tell(Msg::SetEnabled(settings.run_local_stacks()))
        .await?;

    tokio::spawn(async move { receiver(handle).await });

    Ok(())
}

async fn receiver(handle: ActorRef<Worker>) -> ! {
    let mut rx = ethui_broadcast::subscribe_internal().await;

    loop {
        if let Ok(msg) = rx.recv().await {
            println!("Received internal message: {:?}", msg);
            match msg {
                InternalMsg::SettingsUpdated => {
                    let settings = Settings::read().await;

                    println!(
                        "Received internal message: {:?}",
                        settings.run_local_stacks()
                    );
                    handle
                        .tell(Msg::SetEnabled(settings.run_local_stacks()))
                        .await
                        .unwrap();
                }
                _ => (),
            }
        }
    }
}
