mod inner;
mod network;
mod wallet;

use std::sync::Arc;

use futures_util::lock::{Mutex, MutexGuard, MutexLockFuture};

pub use self::inner::ContextInner;
pub use self::network::Network;
pub use self::wallet::Wallet;

#[derive(Clone)]
pub struct Context(Arc<Mutex<ContextInner>>);
pub type UnlockedContext<'a> = MutexGuard<'a, ContextInner>;

impl Context {
    pub fn new() -> Self {
        Self(Arc::new(Mutex::new(ContextInner::new())))
    }

    pub fn lock(&self) -> MutexLockFuture<'_, ContextInner> {
        self.0.lock()
    }
}
