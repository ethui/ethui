use std::time::Duration;

use alloy::{
    network::Ethereum,
    providers::{Provider as _, ProviderBuilder, ext::TraceApi as _},
    rpc::types::{Filter, Log, trace::parity::LocalizedTransactionTrace},
};
use ethui_abis::IERC20;
use ethui_types::{DedupChainId, TokenMetadata, prelude::*};
use futures::StreamExt as _;
use tokio::{sync::mpsc, time::sleep};
use tracing::{instrument, trace, warn};
use url::Url;

use crate::expanders::{expand_logs, expand_traces};

const INITIAL_BACKOFF: Duration = Duration::from_secs(1);
const MAX_BACKOFF: Duration = Duration::from_secs(5);

#[derive(Debug)]
pub struct Tracker {
    quit_snd: Option<mpsc::Sender<()>>,
}

#[derive(Debug, Clone)]
pub struct Ctx {
    dedup_chain_id: DedupChainId,
    http_url: Url,
    ws_url: Option<Url>,
}

#[derive(Debug)]
enum Msg {
    CaughtUp,
    Reset,
    Traces(Vec<LocalizedTransactionTrace>),
    Logs(Vec<Log>),
}

impl Tracker {
    pub fn run(dedup_chain_id: DedupChainId, http_url: Url, ws_url: Option<Url>) -> Self {
        tracing::debug!("Starting anvil tracker");

        let ctx = Ctx {
            dedup_chain_id,
            http_url,
            ws_url,
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

    fn stop(&mut self) {
        tracing::debug!("Stopping anvil tracker");

        let quit_snd = self.quit_snd.take();

        tokio::spawn(async move {
            if let Some(quit_snd) = quit_snd
                && let Err(e) = quit_snd.clone().send(()).await
            {
                warn!("Error closing listener: {:?}", e)
            }
        });
    }
}

impl Drop for Tracker {
    fn drop(&mut self) {
        self.stop();
    }
}

/// Watches a chain for new blocks and sends them to the block processor:
///     1. Waits for an RPC node to be available (since local devnets may be intermittent)
///     2. Once available, syncs from scratch, since any past history may no longer be valid
///     3. Listens to new blocks via websockets
///     4. If anvil_nodeInfo is available, also check forkBlockNumber, and prevent fetching blocks past that (so that forked anvil don't overload or past fetching logic)
#[instrument(skip_all, fields(chain_id = ctx.dedup_chain_id.chain_id(), dedup_id = ctx.dedup_chain_id.dedup_id()), level = "trace")]
async fn watch(
    ctx: Ctx,
    mut quit_rcv: mpsc::Receiver<()>,
    block_snd: mpsc::UnboundedSender<Msg>,
) -> color_eyre::Result<()> {
    loop {
        let from_block = match get_sync_status(&ctx).await {
            None => {
                block_snd
                    .send(Msg::Reset)
                    .map_err(|_| eyre!("Watcher error"))?;
                0
            }
            Some(block_number) => block_number,
        };

        let to_block = wait_for_node(&ctx, &mut quit_rcv).await?;

        let (provider, sub_provider) = init_providers(&ctx).await?;
        let fork_block = get_fork_block_number(&provider).await;
        let from_block = u64::max(from_block, fork_block);

        // Catch up on past blocks
        catch_up_past_blocks(&provider, &block_snd, &ctx, from_block, to_block).await?;

        block_snd
            .send(Msg::CaughtUp)
            .map_err(|_| eyre!("Watcher error"))?;

        // Subscribe and process new blocks
        subscribe_new_blocks(&sub_provider, &provider, &block_snd, &ctx, &mut quit_rcv).await?;
    }
}

// Waits for the node to be available and returns the latest block number
async fn wait_for_node(ctx: &Ctx, quit_rcv: &mut mpsc::Receiver<()>) -> color_eyre::Result<u64> {
    let mut backoff = INITIAL_BACKOFF;
    let mut warned = false;

    loop {
        let http_provider = ProviderBuilder::new()
            .disable_recommended_fillers()
            .connect_http(ctx.http_url.clone());

        tokio::select! {
            _ = quit_rcv.recv() => return Err(eyre!("Watcher quit")),
                res = http_provider.get_block_number() => {
                    match res {
                        Ok(b) => {
                            if warned {
                                tracing::info!("Anvil node is back online at {}", ctx.http_url);
                            }

                            break Ok(b);
                        }
                        Err(e) => {
                            if !warned {
                                tracing::warn!("Anvil node not available at {}: {e}", ctx.http_url);
                                warned = true;
                            } else {
                                tracing::debug!("Retrying Anvil connection in {}s...", backoff.as_secs());
                            }

                            tokio::select! {
                                _ = sleep(backoff) => {},
                                _ = quit_rcv.recv() => return Err(eyre!("Watcher quit")),
                            }

                            backoff = std::cmp::min(backoff * 2, MAX_BACKOFF);
                        }
                    }
                }
        }
    }
}

// Initializes the main and subscription providers
async fn init_providers(
    ctx: &Ctx,
) -> color_eyre::Result<(
    alloy::providers::RootProvider<Ethereum>,
    alloy::providers::RootProvider<Ethereum>,
)> {
    // Disabling retries (max_retries(0)) prevents the main loop from waiting on stale
    // connections when Anvil restarts, allowing proper state reset.
    let url = ctx
        .ws_url
        .clone()
        .unwrap_or_else(|| {
            warn!(
                "No websocket url provided for {}, falling back to http",
                ctx.dedup_chain_id.chain_id()
            );
            ctx.http_url.clone()
        })
        .to_string();

    let provider = ProviderBuilder::new()
        .disable_recommended_fillers()
        .connect(&url)
        .await?;

    let sub_provider = ProviderBuilder::new()
        .disable_recommended_fillers()
        .connect(&url)
        .await?;

    Ok((provider, sub_provider))
}

// Gets the fork block number if available
async fn get_fork_block_number(provider: &alloy::providers::RootProvider<Ethereum>) -> u64 {
    let node_info: serde_json::Value = provider
        .raw_request("anvil_nodeInfo".into(), ())
        .await
        .unwrap_or(serde_json::Value::Null);

    node_info["forkConfig"]["forkBlockNumber"]
        .as_u64()
        .unwrap_or(0)
}

// Catches up on all past blocks from from_block to to_block (inclusive)
#[instrument(skip_all, fields(chain_id = ctx.dedup_chain_id.chain_id(), dedup_id = ctx.dedup_chain_id.dedup_id()), level = "trace")]
async fn catch_up_past_blocks(
    provider: &alloy::providers::RootProvider<Ethereum>,
    block_snd: &mpsc::UnboundedSender<Msg>,
    ctx: &Ctx,
    from_block: u64,
    to_block: u64,
) -> color_eyre::Result<()> {
    for b in from_block..=to_block {
        let traces = provider.trace_block(b.into()).await?;
        block_snd
            .send(Msg::Traces(traces))
            .map_err(|_| eyre!("Watcher error"))?;

        let logs = provider.get_logs(&Filter::new().select(b)).await?;
        block_snd
            .send(Msg::Logs(logs))
            .map_err(|_| eyre!("Watcher error"))?;

        if let Some(block) = provider.get_block(b.into()).await? {
            save_known_tip(ctx.dedup_chain_id, b, block.header.hash).await?;
        }
    }
    Ok(())
}

// Subscribes to new blocks and processes them. Returns Ok(false) if quit signal is received.
async fn subscribe_new_blocks(
    sub_provider: &alloy::providers::RootProvider<Ethereum>,
    provider: &alloy::providers::RootProvider<Ethereum>,
    block_snd: &mpsc::UnboundedSender<Msg>,
    ctx: &Ctx,
    quit_rcv: &mut mpsc::Receiver<()>,
) -> color_eyre::Result<()> {
    let mut stream = sub_provider.subscribe_blocks().await?.into_stream();
    loop {
        tokio::select! {
            _ = quit_rcv.recv() => return Err(eyre!("Watcher quit")),
            b = stream.next() => {
                match b {
                    Some(b) => {
                        trace!("block {}", b.number);
                        let block_traces = provider.trace_block(b.number.into()).await?;
                        block_snd.send(Msg::Traces(block_traces)).map_err(|_| eyre!("Watcher error"))?;

                        let logs = provider.get_logs(&Filter::new().select(b.number)).await?;
                        block_snd.send(Msg::Logs(logs)).map_err(|_| eyre!("Watcher error"))?;

                        save_known_tip(ctx.dedup_chain_id, b.number, b.hash).await?;
                    },
                    None => break,
                }
            }
        }
    }

    Ok(())
}

async fn process(ctx: Ctx, mut block_rcv: mpsc::UnboundedReceiver<Msg>) -> color_eyre::Result<()> {
    let mut caught_up = false;

    let provider = ProviderBuilder::new()
        .disable_recommended_fillers()
        .connect_http(ctx.http_url);
    let db = ethui_db::get();

    while let Some(msg) = block_rcv.recv().await {
        match msg {
            Msg::Reset => {
                trace!(
                    "resetting {} {}",
                    ctx.dedup_chain_id.chain_id(),
                    ctx.dedup_chain_id.dedup_id()
                );
                db.truncate_events(ctx.dedup_chain_id).await?;
                caught_up = true
            }
            Msg::CaughtUp => caught_up = true,
            Msg::Traces(traces) => {
                let events = expand_traces(traces, &provider).await;
                db.save_events(ctx.dedup_chain_id, events).await?
            }
            Msg::Logs(logs) => {
                let events = expand_logs(logs);
                db.save_events(ctx.dedup_chain_id, events).await?
            }
        }

        for address in db
            .get_erc20_missing_metadata(ctx.dedup_chain_id.chain_id())
            .await?
            .into_iter()
        {
            let metadata = fetch_erc20_metadata(address, &provider).await;

            db.save_erc20_metadata(ctx.dedup_chain_id.chain_id(), metadata)
                .await
                .unwrap();
        }

        // don't emit events until we're catching up
        // otherwise we spam too much during that phase
        if caught_up {
            ethui_broadcast::ui_notify(UINotify::TxsUpdated).await;
            ethui_broadcast::ui_notify(UINotify::BalancesUpdated).await;
            ethui_broadcast::ui_notify(UINotify::ContractsUpdated).await;
            ethui_broadcast::contract_found().await;
        }
    }

    Ok(())
}

pub async fn fetch_erc20_metadata(
    address: Address,
    client: &alloy::providers::RootProvider<Ethereum>,
) -> TokenMetadata {
    let contract = IERC20::new(address, client);

    TokenMetadata {
        address,
        name: contract.name().call().await.ok(),
        symbol: contract.symbol().call().await.ok(),
        decimals: contract.decimals().call().await.ok(),
    }
}

async fn save_known_tip(
    dedup_chain_id: DedupChainId,
    block_number: u64,
    hash: B256,
) -> color_eyre::Result<()> {
    let db = ethui_db::get();
    db.kv_set(
        &(
            "anvil_sync",
            dedup_chain_id.chain_id(),
            dedup_chain_id.dedup_id(),
            "block_number",
        ),
        &block_number,
    )
    .await?;
    db.kv_set(
        &(
            "anvil_sync",
            dedup_chain_id.chain_id(),
            dedup_chain_id.dedup_id(),
            "block_hash",
        ),
        &hash,
    )
    .await?;

    Ok(())
}

async fn get_known_tip(dedup_chain_id: DedupChainId) -> color_eyre::Result<Option<(u64, B256)>> {
    let db = ethui_db::get();
    let block_number = db
        .kv_get(&(
            "anvil_sync",
            dedup_chain_id.chain_id(),
            dedup_chain_id.dedup_id(),
            "block_number",
        ))
        .await?;
    let block_hash = db
        .kv_get(&(
            "anvil_sync",
            dedup_chain_id.chain_id(),
            dedup_chain_id.dedup_id(),
            "block_hash",
        ))
        .await?;

    Ok(block_number.zip(block_hash))
}

async fn get_sync_status(ctx: &Ctx) -> Option<u64> {
    let http_provider = ProviderBuilder::new()
        .disable_recommended_fillers()
        .connect_http(ctx.http_url.clone());

    let (known_block_number, known_block_hash) = match get_known_tip(ctx.dedup_chain_id).await {
        Ok(Some(tip)) => tip,
        _ => return None,
    };

    let block = match http_provider.get_block(known_block_number.into()).await {
        Ok(Some(block)) => block,
        _ => return None,
    };

    if known_block_hash == block.header.hash {
        Some(known_block_number + 1)
    } else {
        None
    }
}
