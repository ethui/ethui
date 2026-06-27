pub mod commands;
mod utils;
mod worker;

use ethui_broadcast::InternalMsg;
pub use ethui_sync_alchemy::{
    Alchemy, Erc20Metadata, ErcMetadataResponse, ErcOwnersResponse, get_alchemy,
};
use ethui_types::prelude::*;
use tokio::sync::{Mutex, mpsc, oneshot};
pub use worker::Worker;

pub async fn init() {
    ethui_sync_devnet::init();

    let (snd, rcv) = mpsc::unbounded_channel();
    tokio::spawn(async { receiver(snd).await });
    tokio::spawn(async { Worker::run(rcv).await });
}

#[derive(Debug)]
enum Msg {
    FetchFullTxSync(u64, B256, Arc<Mutex<Option<oneshot::Sender<()>>>>),
    TrackAddress(Address),
    UntrackAddress(Address),
    TrackNetwork(u64),
    UntrackNetwork(u64),
    PollAddress(Address),
    PollNetwork(u64),
}

impl TryFrom<InternalMsg> for Msg {
    type Error = ();

    fn try_from(msg: InternalMsg) -> std::result::Result<Self, Self::Error> {
        let res = match msg {
            InternalMsg::AddressAdded(addr) => Msg::TrackAddress(addr),
            InternalMsg::AddressRemoved(addr) => Msg::UntrackAddress(addr),
            InternalMsg::CurrentAddressChanged(addr) => Msg::PollAddress(addr),
            InternalMsg::NetworkAdded(network) => Msg::TrackNetwork(network.chain_id()),
            InternalMsg::NetworkRemoved(network) => Msg::UntrackNetwork(network.chain_id()),
            InternalMsg::CurrentNetworkChanged(network) => Msg::PollNetwork(network.chain_id()),
            InternalMsg::FetchFullTxSync(chain_id, hash, oneshot) => {
                Msg::FetchFullTxSync(chain_id, hash, oneshot)
            }
            _ => return Err(()),
        };

        Ok(res)
    }
}

/// Receives global messages
/// if a msg is convertible to `Msg`, forward that to the sync worker
#[instrument(skip(snd), level = "trace")]
async fn receiver(snd: mpsc::UnboundedSender<Msg>) -> std::result::Result<(), ()> {
    let mut rx = ethui_broadcast::subscribe_internal().await;

    loop {
        if let Ok(internal_msg) = rx.recv().await
            && let Ok(msg) = internal_msg.try_into()
        {
            snd.send(msg).unwrap();
        }
    }
}
