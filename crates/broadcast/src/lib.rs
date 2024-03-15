use std::{sync::Arc};

pub use internal_msgs::*;
use iron_types::{ui_events, Address, Affinity, B256};
use once_cell::sync::Lazy;
use tokio::sync::{broadcast, oneshot, Mutex, RwLock};
pub use ui_msgs::*;
use url::Url;

/// Supported messages
#[derive(Debug, Clone)]
pub enum InternalMsg {
    ChainChanged(u32, Option<String>, Affinity),
    AccountsChanged(Vec<Address>),
    SettingsUpdated,

    ResetAnvilListener {
        chain_id: u32,
        http: Url,
        ws: Url,
    },

    AddressAdded(Address),
    AddressRemoved(Address),
    CurrentAddressChanged(Address),

    NetworkAdded(u32),
    NetworkRemoved(u32),
    CurrentNetworkChanged(u32),

    /// Request a full update of a TX. oneshot channel included to notify when job is done
    FetchFullTxSync(u32, B256, Arc<Mutex<Option<oneshot::Sender<()>>>>),
    FetchERC20Metadata(u32, Address),

    ForgeAbiFound,
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

    MainWindowShow,
    MainWindowHide,
}

mod internal_msgs {
    use tracing::instrument;
    use InternalMsg::*;

    use super::*;

    /// Creates a new subscriber
    pub async fn subscribe_internal() -> broadcast::Receiver<InternalMsg> {
        INTERNAL.read().await.subscribe()
    }

    /// Broadcasts `ChainChanged` events
    pub async fn chain_changed(chain_id: u32, domain: Option<String>, affinity: Affinity) {
        send(ChainChanged(chain_id, domain, affinity)).await;
    }

    /// Broadcasts `AccountsChanged` events
    pub async fn accounts_changed(addresses: Vec<Address>) {
        send(AccountsChanged(addresses)).await;
    }

    /// Broadcasts `SettingsUpdated` events
    pub async fn settings_updated() {
        send(SettingsUpdated).await;
    }

    /// Requests a reset of the anvil listener for a given chain_id
    pub async fn reset_anvil_listener(chain_id: u32, http: Url, ws: Url) {
        send(ResetAnvilListener { chain_id, http, ws }).await;
    }

    pub async fn address_added(address: Address) {
        send(AddressAdded(address)).await;
    }

    pub async fn address_removed(address: Address) {
        send(AddressRemoved(address)).await;
    }

    pub async fn current_address_changed(address: Address) {
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

    pub async fn forge_abi_found() {
        send(ForgeAbiFound).await;
    }

    #[instrument(level = "trace")]
    pub async fn fetch_full_tx_sync(chain_id: u32, hash: B256) {
        let (tx, rx) = oneshot::channel();
        send(FetchFullTxSync(
            chain_id,
            hash,
            Arc::new(Mutex::new(Some(tx))),
        ))
        .await;
        let _ = rx.await;
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

    pub async fn main_window_show() {
        send(MainWindowShow).await;
    }

    pub async fn main_window_hide() {
        send(MainWindowHide).await;
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
