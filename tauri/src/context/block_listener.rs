use std::time::Duration;

use ethers::{
    providers::{
        Http, HttpClientError, JsonRpcClient, Middleware, Provider, RetryClientBuilder,
        RetryPolicy, Ws,
    },
    types::{Block, Transaction, H256, U64},
};
use futures_util::StreamExt;
use log::{debug, warn};
use tokio::sync::mpsc;
use url::Url;

use crate::{db::DB, error::Error, Result};

#[derive(Debug)]
pub struct BlockListener {
    quit_snd: mpsc::Sender<()>,
}

#[derive(Debug)]
enum Msg {
    Reset,
    Block(Block<Transaction>),
}

impl BlockListener {
    pub fn new(http_url: Url, ws_url: Url, db: DB) -> Self {
        // TODO: I think this could be a oneshot::channel, but I was running into `Copy` trait problems
        let (quit_snd, quit_rcv) = mpsc::channel(10);
        let (block_snd, block_rcv) = mpsc::unbounded_channel();

        tokio::spawn(async move { process(block_rcv, db).await });
        tokio::spawn(async move { watch(http_url, ws_url, quit_rcv, block_snd).await });

        Self { quit_snd }
    }

    pub fn stop(&self) {
        let quit_snd = self.quit_snd.clone();
        tokio::spawn(async move {
            match quit_snd.clone().send(()).await {
                Err(e) => warn!("Error closing listener: {:?}", e),
                _ => (),
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

async fn watch(
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

    'watcher: loop {
        debug!("loop");
        // retry forever

        // make a dummy request, retried forever
        // this is to wait for anvil to be up
        // retries forever, or until watcher close signal received
        tokio::select! {
            _ = quit_rcv.recv() => break 'watcher,
            _ = client.request::<_, U64>("eth_blockNumber", ()) => {}
        };

        block_snd
            .send(Msg::Reset)
            .map_err(|_| Error::WatcherError)?;

        let provider: Provider<Ws> = Provider::<Ws>::connect(&ws_url)
            .await?
            .interval(Duration::from_secs(1));

        // TODO: if we happen to subscribe only when a few blocks have been through, we'll miss a
        // few txs in that case though, we need to consider if we're in a mainnet fork, in which
        // case blindly fetching all previous blocks is a bad idea
        let mut stream = provider.subscribe_blocks().await?;

        'ws: loop {
            // wait for the next block
            // once again, break out if we receive a close signal
            tokio::select! {
                _ = quit_rcv.recv() => break 'watcher,

                b = stream.next() => {
                    match b {
                        Some(b) => {
                            let full_block = provider.get_block_with_txs(b.number.unwrap()).await?.unwrap();
                            block_snd.send(Msg::Block(full_block)).map_err(|_|Error::WatcherError)?;
                        },
                        None => break 'ws,
                    }
                }
            }
        }
    }

    Ok(())
}

use crate::store::transactions::TransactionStore;

async fn process(mut block_rcv: mpsc::UnboundedReceiver<Msg>, db: DB) -> Result<()> {
    while let Some(msg) = block_rcv.recv().await {
        match msg {
            Msg::Reset => db.truncate_transactions().await?,
            Msg::Block(block) => db.save_transactions(block.transactions).await?,
        }
    }

    Ok(())
}
