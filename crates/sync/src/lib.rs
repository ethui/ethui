pub mod commands;
mod utils;
mod worker;

use broadcast::InternalMsg;
pub use sync_alchemy::{
    Alchemy, Erc20Metadata, ErcMetadataResponse, ErcOwnersResponse, get_alchemy,
};
use common::prelude::*;
use tokio::sync::{Mutex, mpsc, oneshot};
pub use worker::Worker;

pub async fn init() {
    sync_anvil::init();

    let (snd, rcv) = mpsc::unbounded_channel();
    tokio::spawn(async { receiver(snd).await });
    tokio::spawn(async { Worker::run(rcv).await });
}

#[derive(Debug)]
enum Msg {
    FetchFullTxSync(u32, B256, Arc<Mutex<Option<oneshot::Sender<()>>>>),
    TrackAddress(Address),
    UntrackAddress(Address),
    TrackNetwork(u32),
    UntrackNetwork(u32),
    PollAddress(Address),
    PollNetwork(u32),
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
    let mut rx = broadcast::subscribe_internal().await;

    loop {
        if let Ok(internal_msg) = rx.recv().await
            && let Ok(msg) = internal_msg.try_into()
        {
            snd.send(msg).unwrap();
        }
    }
}
