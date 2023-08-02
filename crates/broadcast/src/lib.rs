pub use internal_msgs::*;
use iron_types::{ui_events, ChecksummedAddress};
use once_cell::sync::Lazy;
use tokio::sync::{broadcast, RwLock};
pub use ui_msgs::*;
use url::Url;

/// Supported messages
#[derive(Debug, Clone)]
pub enum InternalMsg {
    ChainChanged(u32, String),
    AccountsChanged(Vec<ChecksummedAddress>),

    ResetAnvilListener { chain_id: u32, http: Url, ws: Url },

    AddressAdded(ChecksummedAddress),
    AddressRemoved(ChecksummedAddress),
    CurrentAddressChanged(ChecksummedAddress),

    NetworkAdded(u32),
    NetworkRemoved(u32),
    CurrentNetworkChanged(u32),
}

#[derive(Debug, Clone)]
pub enum UIMsg {
    /// notify the frontend about a state change
    Notify(ui_events::UINotify),

    /// open a dialog
    DialogOpen(ui_events::DialogOpen),

    /// close a dialog
    DialogClose(ui_events::DialogClose),

    /// sends a new event to a dialog
    DialogSend(ui_events::DialogSend),
}

mod internal_msgs {
    use InternalMsg::*;

    use super::*;

    /// Creates a new subscriber
    pub async fn subscribe_internal() -> broadcast::Receiver<InternalMsg> {
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
        send(ResetAnvilListener { chain_id, http, ws }).await;
    }

    pub async fn address_added(address: ChecksummedAddress) {
        send(AddressAdded(address)).await;
    }

    pub async fn address_removed(address: ChecksummedAddress) {
        send(AddressRemoved(address)).await;
    }

    pub async fn current_address_changed(address: ChecksummedAddress) {
        send(CurrentAddressChanged(address)).await;
    }

    pub async fn network_added(chain_id: u32) {
        send(NetworkAdded(chain_id)).await;
    }

    pub async fn network_removed(chain_id: u32) {
        send(NetworkRemoved(chain_id)).await;
    }

    pub async fn current_network_changed(chain_id: u32) {
        send(CurrentNetworkChanged(chain_id)).await;
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

mod ui_msgs {
    use UIMsg::*;

    use super::*;

    /// Creates a new subscriber
    pub async fn subscribe_ui() -> broadcast::Receiver<UIMsg> {
        INTERNAL.read().await.subscribe()
    }

    pub async fn ui_notify(params: ui_events::UINotify) {
        send(Notify(params)).await;
    }

    pub async fn dialog_open(params: ui_events::DialogOpen) {
        send(DialogOpen(params)).await;
    }

    pub async fn dialog_close(params: ui_events::DialogClose) {
        send(DialogClose(params)).await;
    }

    pub async fn dialog_send(params: ui_events::DialogSend) {
        send(DialogSend(params)).await;
    }

    /// broadcaster for UI msgs
    static INTERNAL: Lazy<RwLock<broadcast::Sender<UIMsg>>> = Lazy::new(|| {
        let (tx, _rx) = broadcast::channel(16);
        RwLock::new(tx)
    });

    async fn send<'a>(msg: UIMsg) {
        INTERNAL.read().await.send(msg).unwrap();
    }
}
