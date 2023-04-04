use std::time::Duration;

use ethers::{
    providers::{
        Http, HttpClientError, JsonRpcClient, Middleware, Provider, RetryClientBuilder,
        RetryPolicy, Ws,
    },
    types::{Block, Transaction, U64},
};
use futures_util::StreamExt;
use log::{debug, warn};
use tokio::sync::mpsc;
use url::Url;

use crate::store::{
    block_listeners::{BlockListenerStore, ListenerState},
    transactions::TransactionStore,
};
use crate::{db::DB, error::Error, Result};

#[derive(Debug)]
pub struct BlockListener {
    chain_id: u32,
    http_url: Url,
    ws_url: Url,
    quit_snd: Option<mpsc::Sender<()>>,
    db: DB,
}

#[derive(Debug)]
enum Msg {
    Reset,
    Block(Block<Transaction>),
}

impl BlockListener {
    pub fn new(chain_id: u32, http_url: Url, ws_url: Url, db: DB) -> Self {
        Self {
            chain_id,
            http_url,
            ws_url,
            db,
            quit_snd: None,
        }
    }

    pub fn run(&mut self) -> Result<()> {
        // TODO: I think this could be a oneshot::channel, but I was running into `Copy` trait problems
        let (quit_snd, quit_rcv) = mpsc::channel(10);
        let (block_snd, block_rcv) = mpsc::unbounded_channel();

        {
            let db = self.db.clone();
            let chain_id = self.chain_id;
            tokio::spawn(async move { process(block_rcv, chain_id, db).await });
        }

        {
            let db = self.db.clone();
            let chain_id = self.chain_id;
            let http_url = self.http_url.clone();
            let ws_url = self.ws_url.clone();
            tokio::spawn(async move {
                watch(db, chain_id, http_url, ws_url, quit_rcv, block_snd).await
            });
        }

        self.quit_snd = Some(quit_snd);

        Ok(())
    }

    pub fn stop(&mut self) {
        let quit_snd = self.quit_snd.take();

        tokio::spawn(async move {
            if let Some(quit_snd) = quit_snd {
                if let Err(e) = quit_snd.clone().send(()).await {
                    warn!("Error closing listener: {:?}", e)
                }
            }
        });
    }
}

impl Drop for BlockListener {
    fn drop(&mut self) {
        self.stop();
    }
}

#[derive(Debug, Default)]
struct AlwaysRetry;

impl RetryPolicy<HttpClientError> for AlwaysRetry {
    fn should_retry(&self, _error: &HttpClientError) -> bool {
        true
    }

    fn backoff_hint(&self, _error: &HttpClientError) -> Option<Duration> {
        Some(Duration::from_millis(1000))
    }
}

/// Watches a chain for new blocks and sends them to the block processor This monster is very
/// convoluted:
///     1. waits for an RPC node to be available (since local devnets may be intermittent)
///     2. once it does, syncs from scratch, since any past history may no longer be valid
///     3. listens to new blocks via websockets
///     4. if anvil_nodeInfo is available, also check forkBlockNumber, and prevent fetching blocks
///        past that (so that forked anvil don't overload or past fetching logic)
// TODO: refactor
async fn watch(
    db: DB,
    chain_id: u32,
    http_url: Url,
    ws_url: Url,
    mut quit_rcv: mpsc::Receiver<()>,
    block_snd: mpsc::UnboundedSender<Msg>,
) -> Result<()> {
    // retryclient with infinite retries
    let jsonrpc = Http::new(http_url);
    let client = RetryClientBuilder::default()
        .rate_limit_retries(u32::MAX)
        .timeout_retries(u32::MAX)
        .initial_backoff(Duration::from_millis(1000))
        .build(jsonrpc.clone(), Box::<AlwaysRetry>::default());

    let state: ListenerState = db
        .get_block_listener_state(chain_id)
        .await
        .unwrap_or_else(|_| ListenerState::new(chain_id));
    debug!("{:?}", state);

    'watcher: loop {
        // retry forever

        // make a dummy request, retried forever
        // this is to wait for anvil to be up
        // retries forever, or until watcher close signal received
        let block_number = tokio::select! {
            _ = quit_rcv.recv() => break 'watcher,
            Ok(res) = client.request::<_, U64>("eth_blockNumber", ()) => res
        };

        block_snd
            .send(Msg::Reset)
            .map_err(|_| Error::Watcher)?;

        let provider: Provider<Ws> = Provider::<Ws>::connect(&ws_url)
            .await?
            .interval(Duration::from_secs(1));

        // if we're in a forked anvil, grab the fork block number, so we don't index too much
        let node_info: serde_json::Value = provider
            .request("anvil_nodeInfo", ())
            .await
            .unwrap_or(serde_json::Value::Null);
        let fork_block = node_info["forkConfig"]["forkBlockNumber"]
            .as_u64()
            .unwrap_or(0);

        let mut stream = provider.subscribe_blocks().await?;

        // catch up with everything behind
        // from the moment the fork started (or genesis if not a fork)
        let past_range = fork_block..=block_number.low_u64();
        for b in past_range.into_iter() {
            if let Some(b) = provider.get_block_with_txs(b).await? {
                block_snd
                    .send(Msg::Block(b))
                    .map_err(|_| Error::Watcher)?
            }
        }

        'ws: loop {
            // wait for the next block
            // once again, break out if we receive a close signal
            tokio::select! {
                _ = quit_rcv.recv() => break 'watcher,

                b = stream.next() => {
                    match b {
                        Some(b) => {
                            let full_block = provider.get_block_with_txs(b.number.unwrap()).await?.unwrap();
                            block_snd.send(Msg::Block(full_block)).map_err(|_|Error::Watcher)?;
                        },
                        None => break 'ws,
                    }
                }
            }
        }
    }

    Ok(())
}

async fn process(mut block_rcv: mpsc::UnboundedReceiver<Msg>, chain_id: u32, db: DB) -> Result<()> {
    // TODO: broadcast this info to the frontend, so it can refresh right away
    while let Some(msg) = block_rcv.recv().await {
        match msg {
            Msg::Reset => db.truncate_transactions().await?,
            Msg::Block(block) => db.save_transactions(chain_id, block.transactions).await?,
        }
    }

    Ok(())
}
