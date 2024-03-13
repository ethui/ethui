use std::{
    collections::{HashMap, HashSet},
    sync::Arc,
};

use iron_types::{Address, UINotify, B256};
use tokio::{
    select,
    sync::{mpsc, oneshot, Mutex},
    task::JoinHandle,
    time::{sleep, Duration},
};
use tracing::instrument;

use crate::{utils, Error, Msg, Result};

#[derive(Debug)]
pub struct Worker {
    addresses: HashSet<Address>,
    chain_ids: HashSet<u32>,
    current: (Option<Address>, Option<u32>),
    workers: HashMap<(Address, u32), (JoinHandle<()>, mpsc::UnboundedSender<()>)>,
}

impl Worker {
    fn new() -> Self {
        Self {
            addresses: Default::default(),
            chain_ids: Default::default(),
            current: (None, None),
            workers: Default::default(),
        }
    }
    pub(crate) async fn run(mut rcv: mpsc::UnboundedReceiver<Msg>) -> std::result::Result<(), ()> {
        let mut worker = Self::new();

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
                    FetchFullTxSync(chain_id, hash, oneshot) => {
                        worker.fetch_full_tx_sync(chain_id, hash, oneshot)
                    }
                };

                worker.update_erc20_metadata().await;
            }
        }
    }

    /// creates a new worker per chain ID for the incoming addr
    #[instrument(skip(self), level = "trace")]
    fn track_addr(&mut self, addr: Address) {
        self.addresses.insert(addr);
        for chain_id in self.chain_ids.iter() {
            let task = self.spawn(addr, *chain_id);
            self.workers.insert((addr, *chain_id), task);
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
                let task = self.spawn(*addr, chain_id);
                self.workers.insert((*addr, chain_id), task);
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

    fn spawn(&self, addr: Address, chain_id: u32) -> (JoinHandle<()>, mpsc::UnboundedSender<()>) {
        let (tx, rx) = mpsc::unbounded_channel();

        (
            tokio::spawn(async move { unit_worker(addr, chain_id, rx).await.unwrap() }),
            tx,
        )
    }

    async fn update_erc20_metadata(&self) {
        for chain_id in self.chain_ids.iter() {
            if iron_sync_alchemy::supports_network(*chain_id) {
                let db = iron_db::get();
                let missing = db.get_erc20_missing_metadata(*chain_id).await.unwrap();
                missing.iter().for_each(|address| {
                    self.fetch_erc20_metadata(*chain_id, *address);
                });
                iron_broadcast::ui_notify(UINotify::BalancesUpdated).await;
            }
        }
    }

    #[instrument(skip(self), level = "trace")]
    fn fetch_full_tx_sync(
        &self,
        chain_id: u32,
        hash: B256,
        oneshot: Arc<Mutex<Option<oneshot::Sender<()>>>>,
    ) {
        tokio::spawn(async move {
            if iron_sync_alchemy::supports_network(chain_id) {
                utils::fetch_full_tx(chain_id, hash).await.unwrap();
                let mut oneshot = oneshot.lock().await;
                oneshot.take().map(|tx| tx.send(()));
            }
        });
    }

    fn fetch_erc20_metadata(&self, chain_id: u32, address: Address) {
        tokio::spawn(async move {
            if iron_sync_alchemy::supports_network(chain_id) {
                utils::fetch_erc20_metadata(chain_id, address)
                    .await
                    .unwrap();
            };
        });
    }
}

/// tracks a single (addr, chain_id) pair
/// the wait period between each update will depend on the priority value:
/// * low-priority pairs wait 10 minutes
/// * high-priority waits 30 seconds
#[instrument(skip(rx), level = "trace")]
async fn unit_worker(
    addr: Address,
    chain_id: u32,
    mut rx: mpsc::UnboundedReceiver<()>,
) -> Result<()> {
    loop {
        let alchemy = get_alchemy(chain_id).await?;
        alchemy.fetch_updates(addr).await.unwrap();

        // wait for either a set delay, or for an outside poll request
        select! {
            _ = rx.recv() => {},
            _ = sleep(Duration::from_secs(120)) => {}
        };
    }
}

async fn get_alchemy(chain_id: u32) -> Result<iron_sync_alchemy::Alchemy> {
    let api_key = match iron_sync_alchemy::get_current_api_key().await {
        Ok(Some(api_key)) => api_key,
        _ => return Err(Error::NoApiKey),
    };
    let alchemy = iron_sync_alchemy::Alchemy::new(&api_key, iron_db::get(), chain_id).unwrap();

    Ok(alchemy)
}
