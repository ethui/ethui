pub mod commands;
mod error;
mod utils;
mod worker;

use std::sync::Arc;

pub use error::{Error, Result};
use iron_broadcast::InternalMsg;
use iron_types::{Address, B256};
use tokio::sync::{mpsc, oneshot, Mutex};
use tracing::instrument;
pub use worker::Worker;

pub async fn init() {
    iron_sync_anvil::init();

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
            InternalMsg::NetworkAdded(chain_id) => Msg::TrackNetwork(chain_id),
            InternalMsg::NetworkRemoved(chain_id) => Msg::UntrackNetwork(chain_id),
            InternalMsg::CurrentNetworkChanged(chain_id) => Msg::PollNetwork(chain_id),
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
    let mut rx = iron_broadcast::subscribe_internal().await;

    loop {
        if let Ok(internal_msg) = rx.recv().await {
            if let Ok(msg) = internal_msg.try_into() {
                snd.send(msg).unwrap();
            }
        }
    }
}
