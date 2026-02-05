use std::time::Duration;

use ethui_broadcast::InternalMsg;
use ethui_settings::{SettingsActorExt as _, settings};
use kameo::actor::{ActorRef, Spawn as _};

use crate::actor::{SolArtifactsActor, SolArtifactsActorExt as _};

pub async fn init() -> color_eyre::Result<()> {
    let handle = SolArtifactsActor::spawn(());
    handle.register("sol_artifacts").unwrap();
    let settings = settings()
        .get_all()
        .await
        .expect("Failed to get settings");

    if let Some(ref path) = settings.abi_watch_path {
        handle.update_roots(vec![path.clone().into()]).await?;
    }

    tokio::spawn(async move { receiver(handle).await });

    Ok(())
}

/// Will listen for new ABI updates, and poll the database for new contracts
/// Also periodically polls for new projects (every 30 seconds)
async fn receiver(handle: ActorRef<SolArtifactsActor>) -> ! {
    let mut rx = ethui_broadcast::subscribe_internal().await;
    let mut poll_interval = tokio::time::interval(Duration::from_secs(30));

    loop {
        tokio::select! {
            _ = poll_interval.tick() => {
                // Periodically check for new projects
                if let Err(e) = handle.poll_projects().await {
                    tracing::warn!("Failed to poll projects: {}", e);
                }
            }

            msg = rx.recv() => {
                if let Ok(msg) = msg {
                    match msg {
                        InternalMsg::SettingsUpdated => {
                            let settings = settings()
                                .get_all()
                                .await
                                .expect("Failed to get settings");
                            if let Some(ref path) = settings.abi_watch_path {
                                // TODO: support multiple
                                handle
                                    .update_roots(vec![path.clone().into()])
                                    .await
                                    .unwrap();
                            }
                        }

                        InternalMsg::ContractFound => {
                            handle.new_contract().await.unwrap();
                        }
                        _ => (),
                    }
                }
            }
        }
    }
}
