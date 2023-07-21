pub use internal_msgs::*;
use iron_types::ChecksummedAddress;
use once_cell::sync::Lazy;
use tokio::sync::{broadcast, RwLock};
use url::Url;

/// Supported messages
#[derive(Debug, Clone)]
pub enum InternalMsg {
    ChainChanged(u32, String),
    AccountsChanged(Vec<ChecksummedAddress>),
    ResetAnvilListener { chain_id: u32, http: Url, ws: Url },
}

mod internal_msgs {
    use InternalMsg::*;

    use super::*;

    /// Creates a new subscriber
    pub async fn subscribe() -> broadcast::Receiver<InternalMsg> {
        INTERNAL.read().await.subscribe()
    }

    /// Broadcasts `ChainChanged` events
    pub async fn chain_changed(chain_id: u32, name: String) {
        send(ChainChanged(chain_id, name)).await;
    }

    /// Broadcasts `AccountsChanged` events
    pub async fn accounts_changed(addresses: Vec<ChecksummedAddress>) {
        send(AccountsChanged(addresses)).await;
    }

    /// Requests a reset of the anvil listener for a given chain_id
    pub async fn reset_anvil_listener(chain_id: u32, http: Url, ws: Url) {
        dbg!("here2");
        send(ResetAnvilListener { chain_id, http, ws }).await;
    }

    /// broadcaster for internal msgs
    static INTERNAL: Lazy<RwLock<broadcast::Sender<InternalMsg>>> = Lazy::new(|| {
        let (tx, _rx) = broadcast::channel(16);
        RwLock::new(tx)
    });

    async fn send<'a>(msg: InternalMsg) {
        INTERNAL.read().await.send(msg).unwrap();
    }
}
