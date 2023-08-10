use std::{sync::Arc, time::Duration};

use ethers::{
    providers::{
        Http, HttpClientError, JsonRpcClient, Middleware, Provider, RetryClientBuilder,
        RetryPolicy, Ws,
    },
    types::{Address, Filter, Log, Trace, U64},
};
use futures_util::StreamExt;
use iron_abis::{IERC20, IERC721};
use iron_db::DB;
use iron_types::{Erc721TokenInfo, Erc721TokenMetadata, TokenMetadata, UINotify};
use tokio::sync::mpsc;
use tracing::warn;
use url::Url;

pub use crate::error::{Error, Result};
use crate::expanders::{expand_logs, expand_traces};

#[derive(Debug)]
pub struct Tracker {
    quit_snd: Option<mpsc::Sender<()>>,
}

#[derive(Debug, Clone)]
pub struct Ctx {
    chain_id: u32,
    http_url: Url,
    ws_url: Url,
    db: DB,
}

#[derive(Debug)]
enum Msg {
    CaughtUp,
    Reset,
    Traces(Vec<Trace>),
    Logs(Vec<Log>),
}

impl Tracker {
    pub fn run(chain_id: u32, http_url: Url, ws_url: Url, db: DB) -> Self {
        tracing::debug!("Starting anvil tracker");

        let ctx = Ctx {
            chain_id,
            http_url,
            ws_url,
            db,
        };

        // TODO: I think this could be a oneshot::channel, but I was running into `Copy` trait problems
        let (quit_snd, quit_rcv) = mpsc::channel(10);
        let (block_snd, block_rcv) = mpsc::unbounded_channel();

        {
            let ctx = ctx.clone();
            tokio::spawn(async move { process(ctx, block_rcv).await });
        }

        {
            let ctx = ctx.clone();
            tokio::spawn(async move { watch(ctx, quit_rcv, block_snd).await });
        }

        Self {
            quit_snd: Some(quit_snd),
        }
    }

    pub fn stop(&mut self) {
        tracing::debug!("Stopping anvil tracker");

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

impl Drop for Tracker {
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
async fn watch(
    ctx: Ctx,
    mut quit_rcv: mpsc::Receiver<()>,
    block_snd: mpsc::UnboundedSender<Msg>,
) -> Result<()> {
    // retryclient with infinite retries
    let jsonrpc = Http::new(ctx.http_url);
    let client = RetryClientBuilder::default()
        .rate_limit_retries(u32::MAX)
        .timeout_retries(u32::MAX)
        .initial_backoff(Duration::from_millis(1000))
        .build(jsonrpc.clone(), Box::<AlwaysRetry>::default());

    'watcher: loop {
        // retry forever

        // make a dummy request, retried forever
        // this is to wait for anvil to be up
        // retries forever, or until watcher close signal received
        let block_number = tokio::select! {
            _ = quit_rcv.recv() => break 'watcher,
            Ok(res) = client.request::<_, U64>("eth_blockNumber", ()) => res
        };

        block_snd.send(Msg::Reset).map_err(|_| Error::Watcher)?;

        let provider: Provider<Ws> = Provider::<Ws>::connect(&ctx.ws_url)
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
            let traces = provider.trace_block(b.into()).await?;
            block_snd
                .send(Msg::Traces(traces))
                .map_err(|_| Error::Watcher)?;

            let logs = provider.get_logs(&Filter::new().select(b)).await?;
            block_snd
                .send(Msg::Logs(logs))
                .map_err(|_| Error::Watcher)?;
        }

        block_snd.send(Msg::CaughtUp).map_err(|_| Error::Watcher)?;

        'ws: loop {
            // wait for the next block
            // once again, break out if we receive a close signal
            tokio::select! {
                _ = quit_rcv.recv() => break 'watcher,

                b = stream.next() => {
                    match b {
                        Some(b) => {
                            let block_traces = provider.trace_block(b.number.unwrap().into()).await?;
                            block_snd.send(Msg::Traces(block_traces)).map_err(|_|Error::Watcher)?;

                            let logs = provider.get_logs(&Filter::new().select(b.number.unwrap())).await?;
                            block_snd.send(Msg::Logs(logs)).map_err(|_| Error::Watcher)?;
                        },
                        None => break 'ws,
                    }
                }
            }
        }
    }

    Ok(())
}

async fn process(ctx: Ctx, mut block_rcv: mpsc::UnboundedReceiver<Msg>) -> Result<()> {
    let mut caught_up = false;

    let provider: Provider<Http> = Provider::<Http>::try_from(&ctx.http_url.to_string()).unwrap();

    while let Some(msg) = block_rcv.recv().await {
        match msg {
            Msg::Reset => {
                ctx.db.truncate_events(ctx.chain_id).await?;
                caught_up = false
            }
            Msg::CaughtUp => caught_up = true,
            Msg::Traces(traces) => {
                let events = expand_traces(traces, &provider).await;
                ctx.db.save_events(ctx.chain_id, events).await?
            }
            Msg::Logs(logs) => {
                let events = expand_logs(logs);
                ctx.db.save_events(ctx.chain_id, events).await?
            }
        }

        for erc721_token_info in ctx
            .db
            .get_erc721_missing_metadata(ctx.chain_id)
            .await?
            .into_iter()
        {
            let token_id = erc721_token_info.token_id;
            let address = erc721_token_info.contract;
            let metadata = fetch_erc721_metadata(erc721_token_info, &provider).await;
            ctx.db
                .save_erc721_metadata(address, ctx.chain_id, token_id, metadata)
                .await?;
        }

        for address in ctx
            .db
            .get_erc20_missing_metadata(ctx.chain_id)
            .await?
            .into_iter()
        {
            let metadata = fetch_erc20_metadata(address, &provider).await;

            ctx.db
                .save_erc20_metadata(address, ctx.chain_id, metadata)
                .await
                .unwrap();
        }

        // don't emit events until we're catching up
        // otherwise we spam too much during that phase
        if caught_up {
            iron_broadcast::ui_notify(UINotify::TxsUpdated).await;
            iron_broadcast::ui_notify(UINotify::BalancesUpdated).await;
            iron_broadcast::ui_notify(UINotify::Erc721Updated).await;
        }
    }

    Ok(())
}

pub async fn fetch_erc20_metadata(address: Address, client: &Provider<Http>) -> TokenMetadata {
    let contract = IERC20::new(address, Arc::new(client));

    TokenMetadata {
        name: contract.name().call().await.unwrap_or_default(),
        symbol: contract.symbol().call().await.unwrap_or_default(),
        decimals: contract.decimals().call().await.unwrap_or_default(),
    }
}

pub async fn fetch_erc721_metadata(
    erc721_token_info: Erc721TokenInfo,
    client: &Provider<Http>,
) -> Erc721TokenMetadata {
    let contract = IERC721::new(erc721_token_info.contract, Arc::new(client));
    Erc721TokenMetadata {
        name: contract.name().call().await.unwrap_or_default(),
        symbol: contract.symbol().call().await.unwrap_or_default(),
        uri: contract
            .token_uri(erc721_token_info.token_id)
            .call()
            .await
            .unwrap_or_default(),
    }
}
