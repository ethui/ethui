pub mod commands;
mod error;

use std::collections::{HashMap, HashSet};
use std::sync::Arc;

use error::SyncResult;
use iron_broadcast::InternalMsg;
use iron_db::DB;
use iron_sync_alchemy::Alchemy;
use iron_types::{ChecksummedAddress, GlobalState, UISender};
use tokio::sync::{mpsc, Mutex};
use tokio::task::JoinHandle;
use tokio::time::{sleep, Duration};
use tracing::{error, instrument};

pub async fn init(db: DB, window_snd: UISender) {
    iron_sync_anvil::init(db.clone(), window_snd.clone());
    iron_sync_alchemy::init(db, window_snd).await;

    let (snd, rcv) = mpsc::unbounded_channel();
    tokio::spawn(async { receiver(snd).await });
    tokio::spawn(async { Worker::run(rcv).await });
}

#[derive(Debug)]
enum Msg {
    TrackAddress(ChecksummedAddress),
    UntrackAddress(ChecksummedAddress),
    TrackNetwork(u32),
    UntrackNetwork(u32),
    PriorityAddress(ChecksummedAddress),
    PriorityNetwork(u32),
}

impl TryFrom<InternalMsg> for Msg {
    type Error = ();

    fn try_from(msg: InternalMsg) -> Result<Self, Self::Error> {
        let res = match msg {
            InternalMsg::AddressAdded(addr) => Msg::TrackAddress(addr),
            InternalMsg::AddressRemoved(addr) => Msg::UntrackAddress(addr),
            InternalMsg::CurrentAddressChanged(addr) => Msg::PriorityAddress(addr),
            InternalMsg::NetworkAdded(chain_id) => Msg::TrackNetwork(chain_id),
            InternalMsg::NetworkRemoved(chain_id) => Msg::UntrackNetwork(chain_id),
            InternalMsg::CurrentNetworkChanged(chain_id) => Msg::PriorityNetwork(chain_id),
            _ => return Err(()),
        };

        Ok(res)
    }
}

/// Receives global messages
/// if a msg is convertible to `Msg`, forward that to the sync worker
#[instrument(skip(snd), level = "trace")]
async fn receiver(snd: mpsc::UnboundedSender<Msg>) -> Result<(), ()> {
    let mut rx = iron_broadcast::subscribe().await;

    loop {
        if let Ok(internal_msg) = rx.recv().await {
            if let Ok(msg) = internal_msg.try_into() {
                snd.send(msg).unwrap();
            }
        }
    }
}

#[derive(Debug, Default)]
struct Worker {
    addres: HashSet<ChecksummedAddress>,
    chain_ids: HashSet<u32>,
    priority: (Option<ChecksummedAddress>, Option<u32>),
    workers: HashMap<(ChecksummedAddress, u32), JoinHandle<()>>,
    mutex: Arc<Mutex<()>>,
}

impl Worker {
    async fn run(mut rcv: mpsc::UnboundedReceiver<Msg>) -> Result<(), ()> {
        let mut worker: Self = Default::default();

        loop {
            use Msg::*;
            if let Some(msg) = rcv.recv().await {
                match msg {
                    TrackAddress(addr) => worker.track_addr(addr),
                    UntrackAddress(addr) => worker.untrack_addr(addr),
                    TrackNetwork(chain_id) => worker.track_network(chain_id),
                    UntrackNetwork(chain_id) => worker.untrack_network(chain_id),
                    PriorityAddress(addr) => worker.prioritize_addr(addr),
                    PriorityNetwork(chain_id) => worker.prioritize_network(chain_id),
                };
            }
        }
    }

    /// creates a new worker per chain ID for the incoming addr
    #[instrument(skip(self), level = "trace")]
    fn track_addr(&mut self, addr: ChecksummedAddress) {
        self.addres.insert(addr);
        for chain_id in self.chain_ids.iter() {
            let chain_id = *chain_id;
            let mutex = self.mutex.clone();
            let task = tokio::spawn(async move { unit_worker(addr, chain_id, mutex, false).await });
            self.workers.insert((addr, chain_id), task);
        }
    }

    /// drops all existing workers for this addr
    #[instrument(skip(self), level = "trace")]
    fn untrack_addr(&mut self, addr: ChecksummedAddress) {
        self.addres.remove(&addr);
        self.workers.retain(|(a, _), _| a != &addr);
    }

    /// creates a new worker per addr for this chain_id
    #[instrument(skip(self), level = "trace")]
    fn track_network(&mut self, chain_id: u32) {
        if iron_sync_alchemy::supports_network(chain_id) {
            self.chain_ids.insert(chain_id);
            for addr in self.addres.iter() {
                let addr = *addr;
                let task = self.spawn(addr, chain_id, false);
                self.workers.insert((addr, chain_id), task);
            }
        }
    }

    /// drops all existing workers for this chain_id
    #[instrument(skip(self), level = "trace")]
    fn untrack_network(&mut self, chain_id: u32) {
        self.chain_ids.remove(&chain_id);
        self.workers.retain(|(_, c), _| c != &chain_id);
    }

    /// replaces worker for this addr & current chain_id with a priority one
    #[instrument(skip(self), level = "trace")]
    fn prioritize_addr(&mut self, addr: ChecksummedAddress) {
        // replace previous priority with a regular worker
        if let Some(priority) = self.current_priority() {
            let task = self.spawn(priority.0, priority.1, false);
            self.workers.insert(priority, task);
        }

        self.priority.0 = Some(addr);

        // insert new priority task
        if let Some(priority) = self.current_priority() {
            let task = self.spawn(addr, priority.1, true);
            self.workers.insert((addr, priority.1), task);
        }
    }

    /// replaces worker for this chain_id & current addr with a priority one
    #[instrument(skip(self), level = "trace")]
    fn prioritize_network(&mut self, chain_id: u32) {
        if iron_sync_alchemy::supports_network(chain_id) {
            // replace previous priority with a regular worker
            if let Some(priority) = self.current_priority() {
                let task = self.spawn(priority.0, priority.1, false);
                self.workers.insert(priority, task);
            }

            self.priority.1 = Some(chain_id);

            // insert new priority task
            if let Some(priority) = self.current_priority() {
                let task = self.spawn(priority.0, chain_id, true);
                self.workers.insert((priority.0, chain_id), task);
            }
        }
    }

    fn spawn(&self, addr: ChecksummedAddress, chain_id: u32, priority: bool) -> JoinHandle<()> {
        let mutex = self.mutex.clone();
        tokio::spawn(async move { unit_worker(addr, chain_id, mutex, priority).await })
    }

    fn current_priority(&self) -> Option<(ChecksummedAddress, u32)> {
        if let (Some(addr), Some(chain_id)) = self.priority {
            Some((addr, chain_id))
        } else {
            None
        }
    }
}

/// tracks a single (addr, chain_id) pair
/// the wait period between each update will depend on the priority value:
/// * low-priority pairs wait 10 minutes
/// * high-priority waits 30 seconds
#[instrument(skip(mutex), level = "trace")]
async fn unit_worker(
    addr: ChecksummedAddress,
    chain_id: u32,
    mutex: Arc<Mutex<()>>,
    priority: bool,
) {
    loop {
        // The alchemy global object already acts as a mutex,
        // but that's an implementation detail that may change, so we track our own mutex to ensure
        // only 1 worker at a time
        let _ = mutex.lock().await;

        tracing::trace!(event = "working");

        // the alchemy global object acts as a mutex already
        let alchemy = Alchemy::read().await;

        alchemy
            .fetch_erc20_balances(chain_id, addr.into())
            .await
            .unwrap_or_else(|err| error!(call = "erc20", err = err.to_string()));

        alchemy
            .fetch_native_balance(chain_id, addr.into())
            .await
            .unwrap_or_else(|err| error!(call = "native", err = err.to_string()));

        alchemy
            .fetch_transactions(chain_id, addr.into())
            .await
            .unwrap_or_else(|err| error!(call = "txs", err = err.to_string()));

        let sleep_duration = if priority { 30 } else { 60 * 10 };
        sleep(Duration::from_secs(sleep_duration)).await;
    }
}
