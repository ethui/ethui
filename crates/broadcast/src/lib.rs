use iron_types::ChecksummedAddress;
use once_cell::sync::Lazy;
use tokio::sync::{broadcast, RwLock};

static BROADCAST: Lazy<RwLock<Broadcast>> = Lazy::new(Default::default);

pub async fn subscribe() -> broadcast::Receiver<Msg> {
    BROADCAST.read().await.tx.subscribe()
}

pub async fn chain_changed(chain_id: u32, name: String) {
    BROADCAST
        .write()
        .await
        .tx
        .send(Msg::ChainChanged(chain_id, name))
        .unwrap();
}

pub async fn accounts_changed(addresses: Vec<ChecksummedAddress>) {
    BROADCAST
        .write()
        .await
        .tx
        .send(Msg::AccountsChanged(addresses))
        .unwrap();
}

#[derive(Debug, Clone)]
pub enum Msg {
    ChainChanged(u32, String),
    AccountsChanged(Vec<ChecksummedAddress>),
}

pub struct Broadcast {
    tx: broadcast::Sender<Msg>,
}

impl Default for Broadcast {
    fn default() -> Self {
        let (tx, _rx) = broadcast::channel(16);
        Self { tx }
    }
}
