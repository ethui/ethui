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
    time::interval,
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
        // Wait for the interval (first tick is immediate)
        interval.tick().await;

        // Poll each network's status and check if any changed
        let mut networks = Networks::write().await;

        let any_changes = stream::iter(networks.inner.networks.values_mut())
            .then(|network| async { network.poll_status().await })
            .any(|change| async move { change.is_some() })
            .await;

        // Notify UI if any status changed
        if any_changes {
            ethui_broadcast::ui_notify(UINotify::NetworksChanged).await;
            if let Err(e) = networks.save() {
                error!("Failed to save network status updates: {}", e);
            }
        }
    }
}
