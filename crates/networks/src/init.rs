use std::path::{Path, PathBuf};

use async_trait::async_trait;
use ethui_broadcast::InternalMsg;
use ethui_types::{GlobalState, Network, UINotify};
use once_cell::sync::OnceCell;
use serde_constant::ConstI64;
use tokio::sync::{RwLock, RwLockReadGuard, RwLockWriteGuard};

use crate::{migrations::load_and_migrate, Networks, SerializedNetworks};

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

            if let ChainChanged(dedup_chain_id, _domain, affinity) = msg {
                ethui_broadcast::ui_notify(UINotify::PeersUpdated).await;
                if affinity.is_global() || affinity.is_unset() {
                    // TODO: handle this error
                    let _ = Networks::write()
                        .await
                        .set_current_by_dedup_chain_id(dedup_chain_id)
                        .await;
                }
            }
        }
    }
}
