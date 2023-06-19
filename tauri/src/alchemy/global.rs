use async_trait::async_trait;
use once_cell::sync::OnceCell;
use tokio::sync::{mpsc, RwLock, RwLockReadGuard, RwLockWriteGuard};

use super::Alchemy;
use crate::{app, db::DB, types::GlobalState};

static ALCHEMY: OnceCell<RwLock<Alchemy>> = OnceCell::new();

#[async_trait]
impl GlobalState for Alchemy {
    type Initializer = (DB, mpsc::UnboundedSender<app::Event>);

    async fn init(args: Self::Initializer) {
        let db = args.0;
        let window_snd = args.1;
        let instance = Alchemy::new(db, window_snd);
        ALCHEMY.set(RwLock::new(instance)).unwrap();
    }

    async fn read<'a>() -> RwLockReadGuard<'a, Self> {
        ALCHEMY.get().unwrap().read().await
    }

    async fn write<'a>() -> RwLockWriteGuard<'a, Self> {
        ALCHEMY.get().unwrap().write().await
    }
}
