use ethui_types::{prelude::*, ui_events, Affinity};
pub use internal_msgs::*;
use once_cell::sync::Lazy;
use tokio::sync::{broadcast, oneshot, Mutex};
pub use ui_msgs::*;

/// Supported messages
#[derive(Debug, Clone)]
pub enum InternalMsg {
    ChainChanged(NetworkId, Option<String>, Affinity),
    AccountsChanged(Vec<Address>),
    SettingsUpdated,

    AddressAdded(Address),
    AddressRemoved(Address),
    CurrentAddressChanged(Address),

    NetworkAdded(Network),
    NetworkUpdated(Network),
    NetworkRemoved(Network),
    CurrentNetworkChanged(Network),

    WalletCreated,
    WalletConnected(String), // wallet_type

    PeerAdded,

    TransactionSubmitted(u32), // chain_id

    /// Request a full update of a TX. oneshot channel included to notify when job is done
    FetchFullTxSync(u32, B256, Arc<Mutex<Option<oneshot::Sender<()>>>>),
    FetchERC20Metadata(u32, Address),

    ContractFound,
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
    use tracing::{debug, instrument};
    use InternalMsg::*;

    use super::*;

    /// Creates a new subscriber
    pub async fn subscribe_internal() -> broadcast::Receiver<InternalMsg> {
        INTERNAL.read().await.subscribe()
    }

    /// Broadcasts `ChainChanged` events
    pub async fn chain_changed(id: NetworkId, domain: Option<String>, affinity: Affinity) {
        send(ChainChanged(id, domain, affinity)).await;
    }

    /// Broadcasts `AccountsChanged` events
    pub async fn accounts_changed(addresses: Vec<Address>) {
        send(AccountsChanged(addresses)).await;
    }

    /// Broadcasts `SettingsUpdated` events
    pub async fn settings_updated() {
        send(SettingsUpdated).await;
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

    pub async fn network_added(network: Network) {
        send(NetworkAdded(network)).await;
    }

    pub async fn network_updated(network: Network) {
        send(NetworkUpdated(network)).await;
    }

    pub async fn network_removed(network: Network) {
        send(NetworkRemoved(network)).await;
    }

    pub async fn current_network_changed(network: Network) {
        send(CurrentNetworkChanged(network)).await;
    }

    pub async fn wallet_created() {
        send(WalletCreated).await;
    }

    pub async fn peer_added() {
        send(PeerAdded).await;
    }

    pub async fn contract_found() {
        send(ContractFound).await
    }

    pub async fn wallet_connected(wallet_type: String) {
        send(WalletConnected(wallet_type)).await;
    }

    pub async fn transaction_submitted(chain_id: u32) {
        send(TransactionSubmitted(chain_id)).await;
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

    #[instrument(level = "trace")]
    async fn send(msg: InternalMsg) {
        debug!("UI msg: {:?}", msg);
        INTERNAL.read().await.send(msg).unwrap();
    }
}

mod ui_msgs {
    use tracing::{debug, instrument};
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

    #[instrument(level = "trace")]
    async fn send(msg: UIMsg) {
        debug!("UI msg: {:?}", msg);
        INTERNAL.read().await.send(msg).unwrap();
    }
}
