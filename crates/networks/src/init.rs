use std::{path::PathBuf, time::Duration};

use ethui_broadcast::InternalMsg;
use ethui_types::{Network, UINotify};
use futures::{StreamExt, stream};
use kameo::actor::{ActorRef, Spawn as _};
use tokio::time::{interval, timeout};

use crate::actor::{NetworksActor, NetworksActorExt as _};

pub async fn init(pathbuf: PathBuf) {
    let actor = NetworksActor::spawn(pathbuf);

    actor
        .register("networks")
        .expect("Failed to register actor");

    tokio::spawn(receiver(actor.clone()));
    tokio::spawn(status_poller(actor));
}

async fn receiver(actor: ActorRef<NetworksActor>) -> ! {
    let mut rx = ethui_broadcast::subscribe_internal().await;

    loop {
        if let Ok(msg) = rx.recv().await {
            use InternalMsg::*;

            match msg {
                ChainChanged(id, _domain, affinity) => {
                    ethui_broadcast::ui_notify(UINotify::PeersUpdated).await;
                    if affinity.is_global() || affinity.is_unset() {
                        let _ = actor.set_current(id).await;
                    }
                }
                StackAdd(params) => {
                    let _ = actor.add(params).await;
                }
                StackRemove(name) => {
                    let _ = actor.remove(name).await;
                }
                _ => {}
            }
        }
    }
}

/// Polls the status of each network every 10 seconds
async fn status_poller(actor: ActorRef<NetworksActor>) -> ! {
    let mut interval = interval(Duration::from_secs(10));
    loop {
        interval.tick().await;

        // Get networks to poll
        let networks_to_poll: Vec<(String, Network)> = match actor.get_list().await {
            Ok(list) => list.into_iter().map(|n| (n.name.clone(), n)).collect(),
            Err(_) => continue,
        };

        let poll_results = stream::iter(networks_to_poll)
            .map(|(key, mut network)| async move {
                let result = timeout(Duration::from_secs(2), network.poll_status())
                    .await
                    .unwrap_or_default();
                (key, network, result)
            })
            .buffer_unordered(64)
            .collect::<Vec<_>>()
            .await;

        let any_changes = poll_results.iter().any(|(_, _, change)| change.is_some());

        if any_changes {
            let updates: Vec<(String, Network)> = poll_results
                .into_iter()
                .map(|(key, network, _)| (key, network))
                .collect();

            if let Err(e) = actor.update_statuses(updates).await {
                tracing::error!("Failed to update network statuses: {}", e);
            }

            ethui_broadcast::ui_notify(UINotify::NetworksChanged).await;
        }
    }
}
