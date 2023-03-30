mod inner;
mod network;
mod wallet;

use std::path::PathBuf;
use std::sync::Arc;

use futures_util::lock::{Mutex, MutexGuard, MutexLockFuture};

pub use self::inner::ContextInner;
pub use self::network::Network;
pub use self::wallet::Wallet;
pub use crate::error::Result;

#[derive(Clone)]
pub struct Context(Arc<Mutex<ContextInner>>);
pub type UnlockedContext<'a> = MutexGuard<'a, ContextInner>;

impl Context {
    pub async fn try_new(db_path: PathBuf) -> Result<Self> {
        Ok(Self(Arc::new(Mutex::new(
            ContextInner::try_new(db_path).await?,
        ))))
    }

    pub fn lock(&self) -> MutexLockFuture<'_, ContextInner> {
        self.0.lock()
    }
}
