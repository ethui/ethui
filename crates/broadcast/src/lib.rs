mod global;

use global::read;
use iron_types::ChecksummedAddress;
use tokio::sync::broadcast;

/// Supported messages
#[derive(Debug, Clone)]
pub enum Msg {
    ChainChanged(u32, String),
    AccountsChanged(Vec<ChecksummedAddress>),
}

/// Creates a new subscriber
pub async fn subscribe() -> broadcast::Receiver<Msg> {
    read().await.subscribe()
}

/// Broadcasts `ChainChanged` events
pub async fn chain_changed(chain_id: u32, name: String) {
    read()
        .await
        .send(Msg::ChainChanged(chain_id, name))
        .unwrap();
}

/// Broadcasts `AccountsChanged` events
pub async fn accounts_changed(addresses: Vec<ChecksummedAddress>) {
    read().await.send(Msg::AccountsChanged(addresses)).unwrap();
}
