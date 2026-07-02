use std::{
    collections::{HashMap, HashSet},
    sync::LazyLock,
};

use relay_rpc::domain::Topic;
use tokio::sync::RwLock;
use url::Url;

use crate::{
    CLIENT,
    error::{WcError, WcResult},
};

/// Map from pairing topic to its symmetric key.
pub(crate) static PAIRINGS: LazyLock<RwLock<HashMap<String, [u8; 32]>>> =
    LazyLock::new(|| RwLock::new(HashMap::new()));

/// Pairing topics with a proposal currently being handled (dialog open,
/// awaiting the user). `pair()` subscribes *and* replays the relay's
/// undelivered-message backlog for the same topic, so the same
/// `wc_sessionPropose` can reach `dispatch` twice; this guards against
/// spawning two `handle_proposal` tasks — and two approval dialogs — for it.
static IN_FLIGHT_PROPOSALS: LazyLock<RwLock<HashSet<String>>> =
    LazyLock::new(|| RwLock::new(HashSet::new()));

/// Marks a pairing topic as having a proposal in flight. Returns `false` if
/// one was already in flight, meaning the caller should ignore this message
/// as a duplicate delivery.
pub(crate) async fn start_proposal(topic: &Topic) -> bool {
    IN_FLIGHT_PROPOSALS
        .write()
        .await
        .insert(topic.as_ref().to_owned())
}

/// Clears the in-flight marker once a proposal has been fully resolved
/// (approved, rejected, or failed) so a legitimate future proposal on the
/// same pairing topic isn't blocked forever.
pub(crate) async fn finish_proposal(topic: &Topic) {
    IN_FLIGHT_PROPOSALS.write().await.remove(topic.as_ref());
}

pub struct PairingInfo {
    pub topic: Topic,
    pub sym_key: [u8; 32],
}

/// Parse a `wc:` URI and extract the pairing topic + symmetric key.
///
/// URI format: `wc:<topic>@<version>?relay-protocol=irn&symKey=<hex>`
/// When rewritten as `wc://<topic>@<version>?…`, the URL parser puts the
/// topic in the *username* field and the version number in *host*.
pub fn parse_uri(uri: &str) -> WcResult<PairingInfo> {
    // Url::parse treats `wc:` as an opaque URI, so replace the scheme.
    let normalized = uri.replacen("wc:", "wc://", 1);
    let url = Url::parse(&normalized)?;

    // The topic is the userinfo portion (before the `@`).
    let topic_str = {
        let u = url.username();
        if u.is_empty() {
            // Fallback: some URIs may not have `@version`, try host instead.
            url.host_str()
                .ok_or(WcError::MissingField("pairing topic"))?
        } else {
            u
        }
    };

    let sym_key_hex = url
        .query_pairs()
        .find(|(k, _)| k == "symKey")
        .map(|(_, v)| v.into_owned())
        .ok_or(WcError::MissingField("symKey"))?;

    let mut sym_key = [0u8; 32];
    hex::decode_to_slice(&sym_key_hex, &mut sym_key)?;

    Ok(PairingInfo {
        topic: Topic::from(topic_str),
        sym_key,
    })
}

/// Parse a `wc:` URI, store the sym_key, and subscribe to the pairing topic on the relay.
///
/// After subscribing, immediately fetches any messages the dApp published before
/// we connected — the relay does not replay them automatically on subscribe.
pub async fn pair(uri: &str) -> WcResult<()> {
    let info = parse_uri(uri)?;
    let topic = info.topic.clone();

    PAIRINGS
        .write()
        .await
        .insert(topic.as_ref().to_owned(), info.sym_key);

    let client = match CLIENT.get() {
        Some(client) => client,
        None => {
            PAIRINGS.write().await.remove(topic.as_ref());
            return Err(WcError::Other("walletconnect not initialised".into()));
        }
    };

    if let Err(e) = client.subscribe(topic.clone()).await {
        // Don't leave a stale entry behind — a future message on this topic
        // (e.g. a retried proposal) would otherwise be misinterpreted as
        // belonging to a pairing we never actually subscribed to.
        PAIRINGS.write().await.remove(topic.as_ref());
        return Err(WcError::Other(e.to_string()));
    }

    tracing::info!("walletconnect: subscribed to pairing topic {}", topic);

    // Fetch pending messages published before our subscription.
    let relay = client.clone();
    tokio::spawn(async move {
        use futures::StreamExt as _;
        let mut stream = relay.fetch_stream(vec![topic]);
        while let Some(result) = stream.next().await {
            match result {
                Ok(data) => {
                    crate::session::dispatch(data.topic, data.tag, &data.message).await;
                }
                Err(e) => {
                    tracing::error!("walletconnect: fetch error: {e}");
                    break;
                }
            }
        }
    });

    Ok(())
}

/// Return the sym_key for a pairing topic, if we have one.
pub async fn sym_key_for(topic: &Topic) -> Option<[u8; 32]> {
    PAIRINGS.read().await.get(topic.as_ref()).copied()
}

/// Remove a pairing topic (call when the session has been established or rejected).
pub async fn remove(topic: &Topic) {
    PAIRINGS.write().await.remove(topic.as_ref());
}
