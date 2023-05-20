mod block_listener;
mod inner;
mod wallet;

use std::sync::Arc;

pub use block_listener::BlockListener;
use futures_util::lock::{Mutex, MutexLockFuture};
use tokio::sync::mpsc;

pub use self::inner::ContextInner;
pub use self::wallet::Wallet;
use crate::app;
pub use crate::error::Result;

#[derive(Clone)]
pub struct Context(Arc<Mutex<ContextInner>>);

impl Context {
    /// Reads settings from $APPDIR/settings.json
    ///
    /// Builds default settings if file does not exist
    pub async fn from_settings_file() -> Result<Self> {
        let inner = ContextInner::from_settings_file().await?;

        Ok(Self(Arc::new(Mutex::new(inner))))
    }

    pub async fn init(&mut self, sender: mpsc::UnboundedSender<app::Event>) -> Result<()> {
        self.lock().await.init(sender).await
    }

    pub fn lock(&self) -> MutexLockFuture<'_, ContextInner> {
        self.0.lock()
    }
}
