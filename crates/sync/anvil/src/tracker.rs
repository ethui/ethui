use alloy::{
    network::Ethereum,
    providers::{Provider as _, ProviderBuilder, WsConnect, ext::TraceApi as _},
    rpc::types::{Filter, Log, trace::parity::LocalizedTransactionTrace},
};
use ethui_abis::IERC20;
use ethui_types::{prelude::*, DedupChainId, TokenMetadata};
use futures::StreamExt as _;
use tokio::sync::mpsc;
use tracing::{instrument, trace, warn};
use url::Url;

use crate::expanders::{expand_logs, expand_traces};

#[derive(Debug)]
pub struct Tracker {
    quit_snd: Option<mpsc::Sender<()>>,
}

#[derive(Debug, Clone)]
pub struct Ctx {
    dedup_chain_id: DedupChainId,
    http_url: Url,
    ws_url: Url,
}

#[derive(Debug)]
enum Msg {
    CaughtUp,
    Reset,
    Traces(Vec<LocalizedTransactionTrace>),
    Logs(Vec<Log>),
}

impl Tracker {
    pub fn run(dedup_chain_id: DedupChainId, http_url: Url, ws_url: Url) -> Self {
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

    pub fn stop(&mut self) {
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

/// Watches a chain for new blocks and sends them to the block processor This monster is very
/// convoluted:
///     1. waits for an RPC node to be available (since local devnets may be intermittent)
///     2. once it does, syncs from scratch, since any past history may no longer be valid
///     3. listens to new blocks via websockets
///     4. if anvil_nodeInfo is available, also check forkBlockNumber, and prevent fetching blocks
///        past that (so that forked anvil don't overload or past fetching logic)
#[instrument(skip_all, fields(chain_id = ctx.dedup_chain_id.chain_id(), dedup_id = ctx.dedup_chain_id.dedup_id()), level = "trace")]
async fn watch(
    ctx: Ctx,
    mut quit_rcv: mpsc::Receiver<()>,
    block_snd: mpsc::UnboundedSender<Msg>,
) -> color_eyre::Result<()> {
    'watcher: loop {
        let from_block = match get_sync_status(&ctx).await {
            None => {
                block_snd
                    .send(Msg::Reset)
                    .map_err(|_| eyre!("Watcher error"))?;
                0
            }
            Some(block_number) => block_number,
        };

        // retry forever
        let to_block = 'wait: loop {
            let http_provider = ProviderBuilder::new()
                .disable_recommended_fillers()
                .connect_http(ctx.http_url.clone());

            tokio::select! {
                _ = quit_rcv.recv() => break 'watcher,
                res = http_provider.get_block_number() => {
                    if let Ok(b) = res { break 'wait b }
                }
            };
        };

        let ws_connect = WsConnect::new(ctx.ws_url.to_string());
        let provider = ProviderBuilder::new()
            .disable_recommended_fillers()
            .connect_ws(ws_connect.clone())
            .await?;
        let sub_provider = ProviderBuilder::new()
            .disable_recommended_fillers()
            .connect_ws(ws_connect)
            .await?;

        // if we're in a forked anvil, grab the fork block number, so we don't index too much
        let node_info: serde_json::Value = provider
            .raw_request("anvil_nodeInfo".into(), ())
            .await
            .unwrap_or(serde_json::Value::Null);

        let fork_block = node_info["forkConfig"]["forkBlockNumber"]
            .as_u64()
            .unwrap_or(0);

        let from_block = u64::max(from_block, fork_block);

        trace!("starting from block {}", from_block);

        let mut stream = sub_provider.subscribe_blocks().await?.into_stream();

        // catch up with everything behind
        // from the moment the fork started (or genesis if not a fork)
        let past_range = from_block..=to_block;
        for b in past_range.into_iter() {
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

        trace!("caught up");
        block_snd
            .send(Msg::CaughtUp)
            .map_err(|_| eyre!("Watcher error"))?;

        'ws: loop {
            // wait for the next block
            // once again, break out if we receive a close signal
            tokio::select! {
                _ = quit_rcv.recv() => break 'watcher,

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
                        None => break 'ws,
                    }
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
