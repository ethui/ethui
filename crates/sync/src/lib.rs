pub mod commands;
mod error;

use std::{
    collections::{HashMap, HashSet},
    sync::Arc,
};

pub use error::{Error, Result};
use iron_broadcast::InternalMsg;
use iron_db::DB;
use iron_sync_alchemy::Alchemy;
use iron_types::{Address, GlobalState, UINotify};
use tokio::{
    select,
    sync::{mpsc, Mutex},
    task::JoinHandle,
    time::{sleep, Duration},
};
use tracing::{error, instrument};

pub async fn init(db: DB) {
    iron_sync_anvil::init(db.clone());
    iron_sync_alchemy::init(db.clone()).await;

    let (snd, rcv) = mpsc::unbounded_channel();
    tokio::spawn(async { receiver(snd).await });
    tokio::spawn(async { Worker::run(db, rcv).await });
}

#[derive(Debug)]
enum Msg {
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

#[derive(Debug)]
struct Worker {
    db: DB,
    addresses: HashSet<Address>,
    chain_ids: HashSet<u32>,
    current: (Option<Address>, Option<u32>),
    workers: HashMap<(Address, u32), (JoinHandle<()>, mpsc::UnboundedSender<()>)>,
    mutex: Arc<Mutex<()>>,
}

impl Worker {
    fn new(db: DB) -> Self {
        Self {
            db,
            addresses: Default::default(),
            chain_ids: Default::default(),
            current: (None, None),
            workers: Default::default(),
            mutex: Arc::new(Mutex::new(())),
        }
    }
    async fn run(db: DB, mut rcv: mpsc::UnboundedReceiver<Msg>) -> std::result::Result<(), ()> {
        let mut worker = Self::new(db);

        loop {
            use Msg::*;
            if let Some(msg) = rcv.recv().await {
                match msg {
                    TrackAddress(addr) => worker.track_addr(addr),
                    UntrackAddress(addr) => worker.untrack_addr(addr),
                    TrackNetwork(chain_id) => worker.track_network(chain_id),
                    UntrackNetwork(chain_id) => worker.untrack_network(chain_id),
                    PollAddress(addr) => worker.prioritize_addr(addr),
                    PollNetwork(chain_id) => worker.prioritize_network(chain_id),
                };
            }
        }
    }

    /// creates a new worker per chain ID for the incoming addr
    #[instrument(skip(self), level = "trace")]
    fn track_addr(&mut self, addr: Address) {
        self.addresses.insert(addr);
        for chain_id in self.chain_ids.iter() {
            let chain_id = *chain_id;
            let task = self.spawn(addr, chain_id);
            self.workers.insert((addr, chain_id), task);
        }
    }

    /// drops all existing workers for this addr
    #[instrument(skip(self), level = "trace")]
    fn untrack_addr(&mut self, addr: Address) {
        self.addresses.remove(&addr);
        self.workers.retain(|(a, _), _| a != &addr);
    }

    /// creates a new worker per addr for this chain_id
    #[instrument(skip(self), level = "trace")]
    fn track_network(&mut self, chain_id: u32) {
        if iron_sync_alchemy::supports_network(chain_id) {
            self.chain_ids.insert(chain_id);
            for addr in self.addresses.iter() {
                let addr = *addr;
                let task = self.spawn(addr, chain_id);
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
    fn prioritize_addr(&mut self, addr: Address) {
        self.current.0 = Some(addr);

        if let (Some(address), Some(chain_id)) = self.current {
            self.workers
                .get(&(address, chain_id))
                .map(|(_, rx)| rx.send(()));
        }
    }

    /// replaces worker for this chain_id & current addr with a priority one
    #[instrument(skip(self), level = "trace")]
    fn prioritize_network(&mut self, chain_id: u32) {
        if iron_sync_alchemy::supports_network(chain_id) {
            self.current.1 = Some(chain_id);

            if let (Some(address), Some(chain_id)) = self.current {
                self.workers
                    .get(&(address, chain_id))
                    .map(|(_, rx)| rx.send(()));
            }
        }
    }

    fn spawn(
        &self,
        addr: Address,
        chain_id: u32,
    ) -> (JoinHandle<()>, mpsc::UnboundedSender<()>) {
        let mutex = self.mutex.clone();
        let db = self.db.clone();
        let (tx, rx) = mpsc::unbounded_channel();

        (
            tokio::spawn(async move { unit_worker(addr, chain_id, mutex, db, rx).await }),
            tx,
        )
    }
}

/// tracks a single (addr, chain_id) pair
/// the wait period between each update will depend on the priority value:
/// * low-priority pairs wait 10 minutes
/// * high-priority waits 30 seconds
#[instrument(skip(mutex, db, rx), level = "trace")]
async fn unit_worker(
    addr: Address,
    chain_id: u32,
    mutex: Arc<Mutex<()>>,
    db: DB,
    mut rx: mpsc::UnboundedReceiver<()>,
) {
    let tip = db.get_tip(chain_id, addr.into()).await.ok();
    let delay = 60;

    loop {
        tracing::trace!("waiting again");

        // The alchemy global object already acts as a mutex,
        // but that's an implementation detail that may change, so we track our own mutex to ensure
        // only 1 worker at a time
        let _guard = mutex.lock().await;
        tracing::trace!(event = "working");

        // the alchemy global object acts as a mutex already
        let alchemy = Alchemy::read().await;

        match alchemy.fetch_updates(chain_id, addr.into(), tip).await {
            Ok(result) => {
                if let Some(events) = result.events {
                    let res = db.save_events(chain_id, events).await;
                    log_if_error("save_events", res);

                    // TODO: this event should specify address and chain_id
                    iron_broadcast::ui_notify(UINotify::TxsUpdated).await;
                }

                if let Some(tip) = result.tip {
                    let res = db.set_tip(chain_id, addr.into(), tip).await;
                    log_if_error("set_tip", res);
                }

                if let Some(balances) = result.erc20_balances {
                    let res = db
                        .save_erc20_balances(chain_id, addr.into(), balances)
                        .await;
                    log_if_error("erc20_balances", res);

                    // TODO: this event should specify address and chain_id
                    iron_broadcast::ui_notify(UINotify::BalancesUpdated).await;
                }

                if let Some(balance) = result.native_balance {
                    let res = db.save_native_balance(balance, chain_id, addr.into()).await;
                    log_if_error("native_balances", res);

                    // TODO: this event should specify address and chain_id
                    iron_broadcast::ui_notify(UINotify::BalancesUpdated).await;
                }
            }
            Err(iron_sync_alchemy::Error::NoAPIKey) => {
                // silently ignore
            }
            Err(err) => {
                error!(call = "txs", err = err.to_string());
            }
        }

        // wait for either a set delay, or for an outside poll request
        select! {
            _ = rx.recv() => {},
            _ = sleep(Duration::from_secs(delay)) => {}
        };
    }
}

fn log_if_error<T, E>(call: &str, err: std::result::Result<T, E>)
where
    E: std::error::Error + std::fmt::Display,
{
    if let Err(err) = err {
        error!(call, err = err.to_string());
    }
}
