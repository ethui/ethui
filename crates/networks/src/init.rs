use std::{
    path::{Path, PathBuf},
    time::Duration,
};

use async_trait::async_trait;
use ethui_broadcast::InternalMsg;
use ethui_types::{Network, UINotify, prelude::*};
use futures::{StreamExt, stream};
use once_cell::sync::OnceCell;
use serde_constant::ConstI64;
use tokio::{
    sync::{RwLock, RwLockReadGuard, RwLockWriteGuard},
    task,
    time::{interval, timeout},
};

use crate::{Networks, SerializedNetworks, migrations::load_and_migrate};

static NETWORKS: OnceCell<RwLock<Networks>> = OnceCell::new();

pub async fn init(pathbuf: PathBuf) {
    let path = Path::new(&pathbuf);

    let res: Networks = if path.exists() {
        load_and_migrate(&pathbuf).expect("failed to load networks")
    } else {
        let networks = Network::all_default();
        let current = networks[0].name.clone();

        Networks {
            inner: SerializedNetworks {
                networks: networks.into_iter().map(|n| (n.name.clone(), n)).collect(),
                current,
                version: ConstI64,
            },
            file: pathbuf,
        }
    };

    res.broadcast_init().await;

    NETWORKS.set(RwLock::new(res)).unwrap();

    tokio::spawn(async { receiver().await });
    tokio::spawn(async { status_poller().await });
}

#[async_trait]
impl GlobalState for Networks {
    async fn read<'a>() -> RwLockReadGuard<'a, Self> {
        NETWORKS.get().unwrap().read().await
    }

    async fn write<'a>() -> RwLockWriteGuard<'a, Self> {
        NETWORKS.get().unwrap().write().await
    }
}

async fn receiver() -> ! {
    let mut rx = ethui_broadcast::subscribe_internal().await;

    loop {
        if let Ok(msg) = rx.recv().await {
            use InternalMsg::*;

            match msg {
                ChainChanged(dedup_chain_id, _domain, affinity) => {
                    ethui_broadcast::ui_notify(UINotify::PeersUpdated).await;
                    if affinity.is_global() || affinity.is_unset() {
                        // TODO: handle this error
                        let _ = Networks::write()
                            .await
                            .set_current_by_dedup_chain_id(dedup_chain_id)
                            .await;
                    }
                }
                StackAdd(params) => {
                    let _ = Networks::write().await.add_network(params).await;
                }
                StackRemove(name) => {
                    let _ = Networks::write().await.remove_network(&name).await;
                }
                _ => {}
            }
        }
    }
}

/// Polls the status of each network every 10 seconds
async fn status_poller() -> ! {
    let mut interval = interval(Duration::from_secs(10));
    loop {
        interval.tick().await;

        // Clone networks without holding the lock
        let networks_to_poll = {
            let networks = Networks::read().await;
            networks
                .inner
                .networks
                .iter()
                .map(|(key, network)| (key.clone(), network.clone()))
                .collect::<Vec<_>>()
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
            {
                let mut networks = Networks::write().await;

                // We dont want to hold the lock while we poll networks
                // Update the networks with the polled versions
                for (key, updated_network, _) in poll_results.iter() {
                    networks
                        .inner
                        .networks
                        .insert(key.clone(), updated_network.clone());
                }

                if let Err(e) = networks.save() {
                    error!("Failed to save network status updates: {}", e);
                }
            }

            ethui_broadcast::ui_notify(UINotify::NetworksChanged).await;
        }
    }
}
