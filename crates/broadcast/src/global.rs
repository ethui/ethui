use once_cell::sync::Lazy;
use tokio::sync::{broadcast, RwLock, RwLockReadGuard};

use crate::Msg;

pub(crate) static BROADCAST: Lazy<RwLock<broadcast::Sender<Msg>>> = Lazy::new(|| {
    let (tx, _rx) = broadcast::channel(16);
    RwLock::new(tx)
});

pub(crate) async fn read<'a>() -> RwLockReadGuard<'a, broadcast::Sender<Msg>> {
    BROADCAST.read().await
}
