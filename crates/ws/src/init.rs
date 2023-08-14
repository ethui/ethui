use async_trait::async_trait;
use iron_broadcast::InternalMsg;
use iron_types::GlobalState;
use once_cell::sync::OnceCell;
use tokio::sync::{RwLock, RwLockReadGuard, RwLockWriteGuard};

use crate::{
    peers::{Peers, Store},
    server::server_loop,
};

static PEERS: OnceCell<RwLock<Peers>> = OnceCell::new();

pub async fn init(pathbuf: PathBuf) {
    let path = Path::new(&pathbuf);

    let res: Settings = if path.exists() {
        let file = File::open(path).unwrap();
        let reader = BufReader::new(file);

        let store: Store = serde_json::from_reader(reader).unwrap();

        Peers {
            store,
            file: pathbuf,
            map: Default::default(),
        }
    } else {
        Peers {
            file: pathbuf,
            ..Default::default()
        }
    };

    PEERS.set(RwLock::new(res)).unwrap();

    tokio::spawn(async { server_loop().await });
    tokio::spawn(async { receiver().await });
}

#[async_trait]
impl GlobalState for Peers {
    async fn read<'a>() -> RwLockReadGuard<'a, Self> {
        PEERS.read().await
    }

    async fn write<'a>() -> RwLockWriteGuard<'a, Self> {
        PEERS.write().await
    }
}

async fn receiver() -> ! {
    let mut rx = iron_broadcast::subscribe_internal().await;

    loop {
        if let Ok(msg) = rx.recv().await {
            use InternalMsg::*;

            match msg {
                ChainChanged(chain_id, name) => {
                    Peers::read().await.broadcast_chain_changed(chain_id, name)
                }
                AccountsChanged(accounts) => {
                    Peers::read().await.broadcast_accounts_changed(accounts)
                }
                _ => {}
            }
        }
    }
}
