use alloy::{
    providers::{ext::TraceApi as _, Provider as _, ProviderBuilder, RootProvider, WsConnect},
    rpc::types::{trace::parity::LocalizedTransactionTrace, Filter, Log},
    transports::http::Http,
};
use base64::{self, Engine as _};
use ethui_abis::{IERC721WithMetadata, IERC20, IERC721};
use ethui_types::{Address, Erc721Token, Erc721TokenDetails, TokenMetadata, UINotify};
use futures::StreamExt as _;
use reqwest::Client;
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
}

#[derive(Debug)]
enum Msg {
    CaughtUp,
    Reset,
    Traces(Vec<LocalizedTransactionTrace>),
    Logs(Vec<Log>),
}

impl Tracker {
    pub fn run(chain_id: u32, http_url: Url, ws_url: Url) -> Self {
        tracing::debug!("Starting anvil tracker");

        let ctx = Ctx {
            chain_id,
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
    'watcher: loop {
        block_snd.send(Msg::Reset).map_err(|_| Error::Watcher)?;

        // retry forever
        let block_number = 'wait: loop {
            let http_provider = ProviderBuilder::new().on_http(ctx.http_url.clone());

            tokio::select! {
                _ = quit_rcv.recv() => break 'watcher,
                res = http_provider.get_block_number() => {
                    if let Ok(b) = res { break 'wait b }
                }
            };
        };

        let ws_connect = WsConnect::new(ctx.ws_url.to_string());
        let provider = ProviderBuilder::new().on_ws(ws_connect).await?;

        // if we're in a forked anvil, grab the fork block number, so we don't index too much
        let node_info: serde_json::Value = provider
            .raw_request("anvil_nodeInfo".into(), ())
            .await
            .unwrap_or(serde_json::Value::Null);
        let fork_block = node_info["forkConfig"]["forkBlockNumber"]
            .as_u64()
            .unwrap_or(0);

        let mut stream = provider.subscribe_blocks().await?.into_stream();

        // catch up with everything behind
        // from the moment the fork started (or genesis if not a fork)
        let past_range = fork_block..=block_number;
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
                            let block_traces = provider.trace_block(b.number.into()).await?;
                            block_snd.send(Msg::Traces(block_traces)).map_err(|_|Error::Watcher)?;

                            let logs = provider.get_logs(&Filter::new().select(b.number)).await?;
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

    let provider = ProviderBuilder::new().on_http(ctx.http_url);
    let db = ethui_db::get();

    while let Some(msg) = block_rcv.recv().await {
        match msg {
            Msg::Reset => {
                db.truncate_events(ctx.chain_id).await?;
                caught_up = true
            }
            Msg::CaughtUp => caught_up = true,
            Msg::Traces(traces) => {
                let events = expand_traces(traces, &provider, ctx.chain_id).await;
                db.save_events(ctx.chain_id, events).await?
            }
            Msg::Logs(logs) => {
                let events = expand_logs(logs);
                db.save_events(ctx.chain_id, events).await?
            }
        }

        /* ERC721 - contract tokens' uri and metadata  */
        for erc721_token in db
            .get_erc721_tokens_with_missing_data(ctx.chain_id)
            .await?
            .into_iter()
        {
            let token_id = erc721_token.token_id;
            let address = erc721_token.contract;
            let owner = erc721_token.owner;
            let erc721_data = fetch_erc721_token_data(erc721_token, &provider).await?;

            db.save_erc721_token_data(
                address,
                ctx.chain_id,
                token_id,
                owner,
                erc721_data.uri,
                erc721_data.metadata,
            )
            .await?;
        }

        /* ERC721 - contract's name and symbol  */
        for erc721_address in db
            .get_erc721_collections_with_missing_data(ctx.chain_id)
            .await?
            .into_iter()
        {
            let address = erc721_address;
            let contract = IERC721::new(erc721_address, &provider);
            let name = contract
                .name()
                .call()
                .await
                .map(|r| r.name)
                .unwrap_or_default();
            let symbol = contract
                .symbol()
                .call()
                .await
                .map(|r| r.symbol)
                .unwrap_or_default();

            db.save_erc721_collection(address, ctx.chain_id, name, symbol)
                .await?;
        }

        for address in db
            .get_erc20_missing_metadata(ctx.chain_id)
            .await?
            .into_iter()
        {
            let metadata = fetch_erc20_metadata(address, &provider).await;

            db.save_erc20_metadata(ctx.chain_id, metadata)
                .await
                .unwrap();
        }

        // don't emit events until we're catching up
        // otherwise we spam too much during that phase
        if caught_up {
            ethui_broadcast::ui_notify(UINotify::TxsUpdated).await;
            ethui_broadcast::ui_notify(UINotify::BalancesUpdated).await;
            ethui_broadcast::ui_notify(UINotify::Erc721Updated).await;
            ethui_broadcast::ui_notify(UINotify::ContractsUpdated).await;
            ethui_broadcast::contract_found().await;
        }
    }

    Ok(())
}

pub async fn fetch_erc20_metadata(
    address: Address,
    client: &alloy::providers::RootProvider<Http<Client>>,
) -> TokenMetadata {
    let contract = IERC20::new(address, client);

    TokenMetadata {
        address,
        name: contract.name().call().await.ok().map(|r| r.name),
        symbol: contract.symbol().call().await.ok().map(|r| r.symbol),
        decimals: contract.decimals().call().await.ok().map(|r| r.decimals),
    }
}

pub async fn fetch_erc721_token_data(
    erc721_token: Erc721Token,
    client: &RootProvider<Http<Client>>,
) -> Result<Erc721TokenDetails> {
    let contract = IERC721WithMetadata::new(erc721_token.contract, client);

    let contract_uri = contract
        .tokenURI(erc721_token.token_id)
        .call()
        .await
        .map_err(|_| Error::Erc721FailedToFetchData)?
        .uri
        .to_owned();

    let mut md = "".to_string();
    if contract_uri.contains("data:application/json;base64,") {
        let byte_string = contract_uri
            .strip_prefix("data:application/json;base64,")
            .unwrap_or("");

        let decoded_uri = base64::engine::general_purpose::STANDARD
            .decode(byte_string)
            .map_err(|_| Error::Erc721FailedToFetchData)?;

        md = String::from_utf8(decoded_uri).map_err(|_| Error::Erc721FailedToFetchData)?;
    } else if contract_uri.contains("ipfs://") {
        let contract_uri = contract_uri.replace("ipfs://", "https://ipfs.io/ipfs/");
        let response = reqwest::get(contract_uri.clone())
            .await
            .map_err(|_| Error::Erc721FailedToFetchData)?;

        if response.status().is_success() {
            md = response
                .text()
                .await
                .map_err(|_| Error::Erc721FailedToFetchData)?;
        }
    }

    Ok(Erc721TokenDetails {
        uri: contract_uri,
        metadata: md,
    })
}
