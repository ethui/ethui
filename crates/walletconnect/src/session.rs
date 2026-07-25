use std::{
    collections::HashMap,
    sync::{
        Arc, LazyLock,
        atomic::{AtomicU64, Ordering},
    },
    time::{SystemTime, UNIX_EPOCH},
};

use base64::{
    Engine as _,
    engine::general_purpose::{STANDARD as BASE64, URL_SAFE_NO_PAD},
};
use ethui_dialogs::{Dialog, DialogMsg};
use ethui_types::{Address, ui_events::UINotify};
use ethui_wallets::WalletControl;
use hkdf::Hkdf;
use rand_core::OsRng;
use relay_rpc::domain::Topic;
use sha2::{Digest, Sha256};
use tokio::sync::RwLock;
use x25519_dalek::{EphemeralSecret, PublicKey};
use zeroize::Zeroize;

use crate::{
    CLIENT,
    crypto::{decrypt_type0, encrypt_type0},
    error::{WcError, WcResult},
    pairing,
    store::{DappMetadata, Session},
};

/// In-memory map from session topic → Session.
pub(crate) static SESSIONS: LazyLock<RwLock<HashMap<String, Session>>> =
    LazyLock::new(|| RwLock::new(HashMap::new()));

/// One `ethui_rpc::Handler` per session, built once at settlement and reused
/// for every request on that session — mirrors how `ws/src/server.rs` builds
/// one `Handler` per WS connection instead of one per message. Kept out of
/// `Session` itself (rather than a field on it) since `Session` is serialized
/// wholesale to the frontend and `Handler` has no reason to support that.
static SESSION_HANDLERS: LazyLock<RwLock<HashMap<String, Arc<ethui_rpc::Handler>>>> =
    LazyLock::new(|| RwLock::new(HashMap::new()));

static MSG_ID: AtomicU64 = AtomicU64::new(1);

fn next_msg_id() -> u64 {
    MSG_ID.fetch_add(1, Ordering::Relaxed)
}

fn unix_now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

// ── inbound message dispatch ──────────────────────────────────────────────────

const TAG_SESSION_PROPOSE: u32 = 1100;
const TAG_SESSION_REQUEST: u32 = 1108;
const TAG_SESSION_PING: u32 = 1114;
const TAG_SESSION_UPDATE: u32 = 1104;
const TAG_SESSION_EVENT: u32 = 1110;
const TAG_SESSION_DELETE: u32 = 1112;

/// Entry point called from the message loop for every inbound relay message.
pub async fn dispatch(topic: Topic, tag: u32, raw_message: &str) {
    // Try standard base64, then URL-safe-no-pad as fallback.
    let envelope = match BASE64
        .decode(raw_message.trim())
        .or_else(|_| URL_SAFE_NO_PAD.decode(raw_message.trim()))
    {
        Ok(b) => b,
        Err(e) => {
            tracing::error!("walletconnect: base64 decode failed: {e}");
            return;
        }
    };

    // Envelope bytes at trace level only — useful for local debugging, off by
    // default, and never paired with the sym_key needed to decrypt it.
    tracing::trace!(
        "walletconnect: dispatch tag={} envelope_len={} first48_hex={}",
        tag,
        envelope.len(),
        hex::encode(&envelope[..envelope.len().min(48)]),
    );

    // Try pairing topic first.
    if let Some(sym_key) = pairing::sym_key_for(&topic).await {
        if tag == TAG_SESSION_PROPOSE {
            // Only type-0 (pre-shared sym_key) is valid on a pairing topic —
            // type-1 uses the sym_key as an X25519 static secret, which is
            // semantically wrong here and never sent by a spec-compliant dApp.
            let plaintext = match envelope.first() {
                Some(&0x00) => decrypt_type0(&envelope, &sym_key),
                other => Err(WcError::Crypto(format!(
                    "unexpected envelope type on pairing topic: {other:?}"
                ))),
            };
            let mut plaintext = match plaintext {
                Ok(p) => p,
                Err(e) => {
                    tracing::error!("walletconnect: pairing decrypt failed: {e}");
                    return;
                }
            };
            let payload: serde_json::Value = match serde_json::from_slice(&plaintext) {
                Ok(v) => v,
                Err(e) => {
                    plaintext.zeroize();
                    tracing::error!("walletconnect: JSON parse failed: {e}");
                    return;
                }
            };
            plaintext.zeroize();

            // The relay backlog fetch in `pairing::pair` can redeliver a proposal
            // that also arrived live — without this, both deliveries would spawn
            // their own dialog and settle independent sessions for one pairing.
            if !pairing::start_proposal(&topic).await {
                tracing::debug!(
                    "walletconnect: duplicate session proposal on {} ignored",
                    topic
                );
                return;
            }

            // Spawn so the message loop is not blocked while the dialog is open.
            let pairing_topic = topic.clone();
            tokio::spawn(async move {
                if let Err(e) = handle_proposal(pairing_topic.clone(), &sym_key, payload).await {
                    tracing::error!("walletconnect: proposal handling failed: {e}");
                }
                pairing::finish_proposal(&pairing_topic).await;
            });
        }
        return;
    }

    // Try session topic.
    let sym_key = {
        let sessions = SESSIONS.read().await;
        match sessions.get(topic.as_ref()) {
            Some(s) => s.sym_key,
            None => {
                tracing::warn!("walletconnect: unknown topic {}", topic);
                return;
            }
        }
    };

    let mut plaintext = match decrypt_type0(&envelope, &sym_key) {
        Ok(p) => p,
        Err(e) => {
            tracing::error!("walletconnect: type-0 decrypt failed: {e}");
            return;
        }
    };
    let payload: serde_json::Value = match serde_json::from_slice(&plaintext) {
        Ok(v) => v,
        Err(e) => {
            plaintext.zeroize();
            tracing::error!("walletconnect: JSON parse failed: {e}");
            return;
        }
    };
    plaintext.zeroize();

    match tag {
        TAG_SESSION_REQUEST => {
            tokio::spawn(async move {
                if let Err(e) = handle_request(topic, sym_key, payload).await {
                    tracing::error!("walletconnect: request handling failed: {e}");
                }
            });
        }
        TAG_SESSION_PING => {
            tokio::spawn(async move {
                if let Err(e) = send_ping_response(topic, sym_key, &payload).await {
                    tracing::error!("walletconnect: ping response failed: {e}");
                }
            });
        }
        TAG_SESSION_DELETE => {
            let topic_str = topic.as_ref().to_owned();
            tokio::spawn(async move {
                SESSIONS.write().await.remove(&topic_str);
                SESSION_HANDLERS.write().await.remove(&topic_str);
                ethui_broadcast::ui_notify(UINotify::WcSessionsUpdated).await;
                tracing::info!("walletconnect: session {} deleted by peer", topic_str);
            });
        }
        TAG_SESSION_UPDATE => {
            tracing::debug!("walletconnect: session update (ignored)");
        }
        _ => {
            tracing::debug!("walletconnect: unhandled tag {tag} on session topic");
        }
    }
}

// ── session proposal & settlement ────────────────────────────────────────────

/// Builds eip155 accounts for every requested chain, e.g. "eip155:1:0x...".
/// Falls back to Ethereum mainnet if no chains were requested, or if none of
/// the requested chains were eip155 (settling with zero accounts is rejected
/// by some dApps, so an empty result here is never acceptable).
fn build_eip155_accounts(chains: &[String], address: Address) -> Vec<String> {
    let accounts: Vec<String> = chains
        .iter()
        .filter(|c| c.starts_with("eip155:"))
        .map(|c| format!("{c}:{address:#x}"))
        .collect();

    if accounts.is_empty() {
        vec![format!("eip155:1:{address:#x}")]
    } else {
        accounts
    }
}

/// Collect all string values from `ns["eip155"][field]` arrays.
fn collect_strings(namespaces: &serde_json::Value, field: &str) -> Vec<String> {
    namespaces["eip155"][field]
        .as_array()
        .map(Vec::as_slice)
        .unwrap_or(&[])
        .iter()
        .filter_map(|v| v.as_str().map(String::from))
        .collect()
}

/// Filters a dApp's requested methods down to what `supported` covers.
///
/// If any `required` method is unsupported, the whole namespace can't be
/// satisfied — returns `Err` with those methods so the caller can reject the
/// proposal instead of settling a session that can never work as needed.
/// Unsupported `optional` methods are just dropped, since that's what
/// "optional" means; the returned list is the deduped union actually approved.
fn filter_methods(
    required: Vec<String>,
    optional: Vec<String>,
    supported: &std::collections::HashSet<String>,
) -> Result<Vec<String>, Vec<String>> {
    let unsupported_required: Vec<String> = required
        .iter()
        .filter(|m| !supported.contains(*m))
        .cloned()
        .collect();

    if !unsupported_required.is_empty() {
        return Err(unsupported_required);
    }

    let mut seen = std::collections::HashSet::new();
    Ok(required
        .into_iter()
        .chain(optional)
        .filter(|m| supported.contains(m))
        .filter(|m| seen.insert(m.clone()))
        .collect())
}

async fn handle_proposal(
    pairing_topic: Topic,
    pairing_sym_key: &[u8; 32],
    payload: serde_json::Value,
) -> WcResult<()> {
    let proposal_id = payload["id"]
        .as_u64()
        .ok_or(WcError::MissingField("proposal id"))?;

    let proposer = &payload["params"]["proposer"];
    let proposer_pub_hex = proposer["publicKey"]
        .as_str()
        .ok_or(WcError::MissingField("proposer.publicKey"))?;
    let metadata = &proposer["metadata"];
    // Some dApps put everything in requiredNamespaces, others use optionalNamespaces.
    let required = &payload["params"]["requiredNamespaces"];
    let optional = &payload["params"]["optionalNamespaces"];

    let chains: Vec<String> = {
        let mut seen = std::collections::HashSet::new();
        collect_strings(required, "chains")
            .into_iter()
            .chain(collect_strings(optional, "chains"))
            .filter(|c| seen.insert(c.clone()))
            .collect()
    };

    let required_methods = collect_strings(required, "methods");
    let optional_methods = collect_strings(optional, "methods");

    // Never mirror back a method just because the dApp asked for it — only
    // claim what ethui_rpc actually has a handler for.
    let supported: std::collections::HashSet<String> = ethui_rpc::Handler::new(None)
        .method_names()
        .map(String::from)
        .collect();

    let peer = DappMetadata {
        name: metadata["name"].as_str().unwrap_or("Unknown").to_owned(),
        url: metadata["url"].as_str().unwrap_or("").to_owned(),
        icons: metadata["icons"]
            .as_array()
            .unwrap_or(&vec![])
            .iter()
            .filter_map(|v| v.as_str().map(String::from))
            .collect(),
    };

    // A required method ethui can't serve means the session can never work as
    // the dApp needs it to — reject up front instead of settling a session
    // that's silently broken from the start. Optional methods we can't serve
    // are just dropped, not an error — that's what "optional" means.
    let allowed_methods = match filter_methods(required_methods, optional_methods, &supported) {
        Ok(methods) => methods,
        Err(unsupported_required) => {
            tracing::warn!(
                "walletconnect: rejecting proposal from {} — unsupported required methods: {:?}",
                peer.url,
                unsupported_required
            );
            let error = serde_json::json!({
                "id": proposal_id,
                "jsonrpc": "2.0",
                "error": {
                    "code": 5003,
                    "message": format!(
                        "Non conforming namespaces: unsupported required methods {unsupported_required:?}"
                    )
                }
            });
            publish(&pairing_topic, pairing_sym_key, &error, 1101, 300, false).await?;
            pairing::remove(&pairing_topic).await;
            return Ok(());
        }
    };

    let approved = open_dialog(&peer, &chains, &allowed_methods).await?;
    if !approved {
        tracing::info!("walletconnect: user rejected session proposal");
        // Without this, the dApp just waits until its own timeout — it has
        // no way to know the user actually said no.
        let error = serde_json::json!({
            "id": proposal_id,
            "jsonrpc": "2.0",
            "error": { "code": 5000, "message": "User rejected the session proposal" }
        });
        publish(&pairing_topic, pairing_sym_key, &error, 1101, 300, false).await?;
        pairing::remove(&pairing_topic).await;
        return Ok(());
    }

    settle_session(
        pairing_topic,
        pairing_sym_key,
        proposal_id,
        proposer_pub_hex,
        peer,
        chains,
        allowed_methods,
    )
    .await
}

async fn open_dialog(peer: &DappMetadata, chains: &[String], methods: &[String]) -> WcResult<bool> {
    let dialog = Dialog::new(
        "wc-session-proposal",
        serde_json::json!({
            "name":    peer.name,
            "url":     peer.url,
            "icons":   peer.icons,
            "chains":  chains,
            "methods": methods,
        }),
    );

    dialog
        .open()
        .await
        .map_err(|e| WcError::Other(e.to_string()))?;

    // Explicitly read `approved` rather than treating any `Data` payload as
    // approval — a close, or a `{approved: false}` payload, must reject.
    Ok(matches!(
        dialog.recv().await,
        Some(DialogMsg::Data(data)) if data["approved"].as_bool() == Some(true)
    ))
}

async fn settle_session(
    pairing_topic: Topic,
    pairing_sym_key: &[u8; 32],
    proposal_id: u64,
    proposer_pub_hex: &str,
    peer: DappMetadata,
    chains: Vec<String>,
    allowed_methods: Vec<String>,
) -> WcResult<()> {
    // Generate responder keypair.
    let our_secret = EphemeralSecret::random_from_rng(OsRng);
    let our_public = PublicKey::from(&our_secret);

    // ECDH with proposer public key.
    let proposer_bytes: [u8; 32] = hex::decode(proposer_pub_hex)
        .map_err(WcError::Hex)?
        .try_into()
        .map_err(|_| WcError::Crypto("proposer pubkey wrong length".into()))?;
    let proposer_pub = PublicKey::from(proposer_bytes);
    let shared = our_secret.diffie_hellman(&proposer_pub);

    // Derive session sym_key via HKDF-SHA256.
    let hk = Hkdf::<Sha256>::new(None, shared.as_bytes());
    let mut session_sym_key = [0u8; 32];
    hk.expand(&[], &mut session_sym_key)
        .map_err(|_| WcError::Crypto("hkdf expand failed".into()))?;

    // Session topic = SHA-256(session sym_key).
    let session_topic = Topic::from(hex::encode(Sha256::digest(session_sym_key)).as_str());

    let client = CLIENT
        .get()
        .ok_or_else(|| WcError::Other("walletconnect not initialised".into()))?;

    // Subscribe to the new session topic.
    client
        .subscribe(session_topic.clone())
        .await
        .map_err(|e| WcError::Other(e.to_string()))?;

    let address = ethui_wallets::get_current_wallet()
        .await
        .get_current_address()
        .await;

    let our_pub_hex = hex::encode(our_public.as_bytes());
    let expiry = unix_now() + 604_800; // 1 week

    let eip155_accounts = build_eip155_accounts(&chains, address);

    // 1) Respond to proposal on the PAIRING topic (tag 1101).
    let pairing_response = serde_json::json!({
        "id": proposal_id,
        "jsonrpc": "2.0",
        "result": {
            "relay": { "protocol": "irn" },
            "responderPublicKey": our_pub_hex
        }
    });
    publish(
        &pairing_topic,
        pairing_sym_key,
        &pairing_response,
        1101,
        300,
        false,
    )
    .await?;

    // 2) Send wc_sessionSettle on the SESSION topic (tag 1102).
    //    The `controller` field is required by the WC SDK for validation.
    let settle = serde_json::json!({
        "id": next_msg_id(),
        "jsonrpc": "2.0",
        "method": "wc_sessionSettle",
        "params": {
            "relay": { "protocol": "irn" },
            "namespaces": {
                "eip155": {
                    "accounts": eip155_accounts,
                    "methods": allowed_methods,
                    "events": ["chainChanged", "accountsChanged"]
                }
            },
            "controller": {
                "publicKey": our_pub_hex,
                "metadata": {
                    "name": "ethui",
                    "description": "ethui developer wallet",
                    "url": "https://ethui.dev",
                    "icons": []
                }
            },
            "expiry": expiry
        }
    });
    publish(&session_topic, &session_sym_key, &settle, 1102, 300, true).await?;

    // Store session.
    let session = Session {
        topic: session_topic.clone(),
        sym_key: session_sym_key,
        peer,
        allowed_methods,
        chains,
        address,
        expiry,
    };
    // Built once per session, like `ws/src/server.rs` builds one Handler per
    // WS connection — not per request, which would panic below whenever
    // `peer.url` is empty or fails to parse (both real for dApps that omit
    // proposal metadata), since `Ctx::request_permissions` used to unwrap it.
    let domain = url::Url::parse(&session.peer.url)
        .ok()
        .and_then(|u| u.host_str().map(|h| h.to_owned()));
    let handler = Arc::new(ethui_rpc::Handler::new(domain));

    // Insert the handler before the session: `handle_request` reads SESSIONS
    // then SESSION_HANDLERS, so a reader that observes the session here is
    // guaranteed (via lock release/acquire ordering) to also observe its
    // handler already in place — never the reverse.
    SESSION_HANDLERS
        .write()
        .await
        .insert(session_topic.as_ref().to_owned(), handler);
    SESSIONS
        .write()
        .await
        .insert(session_topic.as_ref().to_owned(), session);
    ethui_broadcast::ui_notify(UINotify::WcSessionsUpdated).await;

    // Clean up pairing entry (not needed after session is established).
    pairing::remove(&pairing_topic).await;

    tracing::info!(
        "walletconnect: session established on topic {}",
        session_topic
    );
    Ok(())
}

// ── session request forwarding ────────────────────────────────────────────────

async fn handle_request(
    topic: Topic,
    sym_key: [u8; 32],
    payload: serde_json::Value,
) -> WcResult<()> {
    let wc_id = payload["id"]
        .as_u64()
        .ok_or(WcError::MissingField("request id"))?;

    let inner = &payload["params"]["request"];
    let method = inner["method"]
        .as_str()
        .ok_or(WcError::MissingField("request.method"))?;
    let params = &inner["params"];

    let session = {
        let sessions = SESSIONS.read().await;
        sessions.get(topic.as_ref()).cloned()
    };
    let Some(session) = session else {
        tracing::warn!("walletconnect: request on unknown session {}", topic);
        return Ok(());
    };

    if unix_now() > session.expiry {
        tracing::warn!(
            "walletconnect: rejecting request on expired session {}",
            topic
        );
        let error = serde_json::json!({
            "id": wc_id,
            "jsonrpc": "2.0",
            "error": { "code": 5000, "message": "Session expired" }
        });
        return publish(&topic, &sym_key, &error, 1109, 300, false).await;
    }

    if !session.allowed_methods.iter().any(|m| m == method) {
        tracing::warn!(
            "walletconnect: rejecting unauthorized method {method} on session {}",
            topic
        );
        let error = serde_json::json!({
            "id": wc_id,
            "jsonrpc": "2.0",
            "error": { "code": 5001, "message": format!("Unauthorized method: {method}") }
        });
        return publish(&topic, &sym_key, &error, 1109, 300, false).await;
    }

    let rpc_req = serde_json::json!({
        "jsonrpc": "2.0",
        "id": wc_id,
        "method": method,
        "params": params
    });
    let rpc_request: jsonrpc_core::Request = serde_json::from_value(rpc_req)?;

    let handler = {
        let handlers = SESSION_HANDLERS.read().await;
        handlers.get(topic.as_ref()).cloned()
    };
    let Some(handler) = handler else {
        tracing::warn!("walletconnect: no rpc handler for session {}", topic);
        return Ok(());
    };
    let response = handler.handle(rpc_request).await;

    if let Some(resp) = response {
        let body = serde_json::to_string(&resp)?;
        publish_raw(&topic, &sym_key, body.as_bytes(), 1109, 300, false).await?;
    }

    Ok(())
}

// ── lifecycle helpers ─────────────────────────────────────────────────────────

async fn send_ping_response(
    topic: Topic,
    sym_key: [u8; 32],
    payload: &serde_json::Value,
) -> WcResult<()> {
    let id = payload["id"].as_u64().unwrap_or_else(next_msg_id);
    let response = serde_json::json!({ "id": id, "jsonrpc": "2.0", "result": true });
    publish(&topic, &sym_key, &response, 1115, 60, false).await
}

/// Disconnect a session from our side and notify the dApp.
pub async fn disconnect(topic: Topic) -> WcResult<()> {
    let sym_key = {
        let sessions = SESSIONS.read().await;
        sessions
            .get(topic.as_ref())
            .map(|s| s.sym_key)
            .ok_or(WcError::SessionNotFound)?
    };

    let delete_payload = serde_json::json!({
        "id": next_msg_id(),
        "jsonrpc": "2.0",
        "method": "wc_sessionDelete",
        "params": { "code": 6000, "message": "User disconnected" }
    });
    publish(&topic, &sym_key, &delete_payload, 1112, 60, false).await?;

    let client = CLIENT
        .get()
        .ok_or_else(|| WcError::Other("walletconnect not initialised".into()))?;
    client
        .unsubscribe(topic.clone())
        .await
        .map_err(|e| WcError::Other(e.to_string()))?;

    SESSIONS.write().await.remove(topic.as_ref());
    SESSION_HANDLERS.write().await.remove(topic.as_ref());
    ethui_broadcast::ui_notify(UINotify::WcSessionsUpdated).await;
    tracing::info!("walletconnect: disconnected from {}", topic);
    Ok(())
}

/// Disconnects every active session, notifying each dApp — called on full app
/// shutdown so a connected dApp sees a clean disconnect instead of just
/// losing its wallet with no explanation (indistinguishable from a crash).
pub async fn disconnect_all() {
    let topics: Vec<Topic> = SESSIONS
        .read()
        .await
        .values()
        .map(|s| s.topic.clone())
        .collect();

    for topic in topics {
        if let Err(e) = disconnect(topic.clone()).await {
            tracing::warn!("walletconnect: failed to disconnect {topic} on shutdown: {e}");
        }
    }
}

/// Return a snapshot of all active sessions (for the UI).
pub async fn list_sessions() -> Vec<Session> {
    SESSIONS.read().await.values().cloned().collect()
}

/// Switches the account exposed to a dApp for an existing session: updates the
/// approved accounts list (`wc_sessionUpdate`) and notifies the dApp of the
/// change (`wc_sessionEvent` "accountsChanged"). No re-approval is needed on
/// the dApp side — same as switching accounts in a browser extension wallet.
pub async fn switch_account(topic: Topic, new_address: Address) -> WcResult<()> {
    let (sym_key, chains, allowed_methods) = {
        let sessions = SESSIONS.read().await;
        let session = sessions
            .get(topic.as_ref())
            .ok_or(WcError::SessionNotFound)?;
        (
            session.sym_key,
            session.chains.clone(),
            session.allowed_methods.clone(),
        )
    };

    let accounts = build_eip155_accounts(&chains, new_address);

    let update = serde_json::json!({
        "id": next_msg_id(),
        "jsonrpc": "2.0",
        "method": "wc_sessionUpdate",
        "params": {
            "namespaces": {
                "eip155": {
                    "accounts": accounts,
                    "methods": allowed_methods,
                    "events": ["chainChanged", "accountsChanged"]
                }
            }
        }
    });
    publish(&topic, &sym_key, &update, TAG_SESSION_UPDATE, 300, false).await?;

    let chain_id = chains
        .first()
        .cloned()
        .unwrap_or_else(|| "eip155:1".to_owned());
    let event = serde_json::json!({
        "id": next_msg_id(),
        "jsonrpc": "2.0",
        "method": "wc_sessionEvent",
        "params": {
            "event": { "name": "accountsChanged", "data": [format!("{new_address:#x}")] },
            "chainId": chain_id
        }
    });
    publish(&topic, &sym_key, &event, TAG_SESSION_EVENT, 300, false).await?;

    SESSIONS
        .write()
        .await
        .get_mut(topic.as_ref())
        .ok_or(WcError::SessionNotFound)?
        .address = new_address;
    ethui_broadcast::ui_notify(UINotify::WcSessionsUpdated).await;

    tracing::info!("walletconnect: switched {} to {new_address:#x}", topic);
    Ok(())
}

// ── publish helpers ───────────────────────────────────────────────────────────

async fn publish(
    topic: &Topic,
    sym_key: &[u8; 32],
    payload: &serde_json::Value,
    tag: u32,
    ttl_secs: u64,
    prompt: bool,
) -> WcResult<()> {
    let body = serde_json::to_string(payload)?;
    publish_raw(topic, sym_key, body.as_bytes(), tag, ttl_secs, prompt).await
}

async fn publish_raw(
    topic: &Topic,
    sym_key: &[u8; 32],
    plaintext: &[u8],
    tag: u32,
    ttl_secs: u64,
    prompt: bool,
) -> WcResult<()> {
    let envelope = encrypt_type0(plaintext, sym_key)?;
    let encoded = BASE64.encode(&envelope);

    let client = CLIENT
        .get()
        .ok_or_else(|| WcError::Other("walletconnect not initialised".into()))?;

    client
        .publish(
            topic.clone(),
            encoded.as_str(),
            None,
            tag,
            std::time::Duration::from_secs(ttl_secs),
            prompt,
        )
        .await
        .map_err(|e| WcError::Other(e.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn addr() -> Address {
        "0x0102030405060708091011121314151617181920"
            .parse()
            .unwrap()
    }

    fn set(methods: &[&str]) -> std::collections::HashSet<String> {
        methods.iter().map(|m| m.to_string()).collect()
    }

    #[test]
    fn filter_methods_rejects_when_a_required_method_is_unsupported() {
        let required = vec!["eth_sendTransaction".to_owned(), "wallet_scan".to_owned()];
        let optional = vec![];
        let supported = set(&["eth_sendTransaction", "personal_sign"]);

        let err = filter_methods(required, optional, &supported).unwrap_err();
        assert_eq!(err, vec!["wallet_scan".to_owned()]);
    }

    #[test]
    fn filter_methods_drops_unsupported_optional_methods_silently() {
        let required = vec!["eth_sendTransaction".to_owned()];
        let optional = vec!["personal_sign".to_owned(), "wallet_scan".to_owned()];
        let supported = set(&["eth_sendTransaction", "personal_sign"]);

        let allowed = filter_methods(required, optional, &supported).unwrap();
        assert_eq!(
            allowed,
            vec!["eth_sendTransaction".to_owned(), "personal_sign".to_owned()]
        );
    }

    #[test]
    fn filter_methods_dedups_methods_present_in_both_lists() {
        let required = vec!["eth_sendTransaction".to_owned()];
        let optional = vec!["eth_sendTransaction".to_owned(), "personal_sign".to_owned()];
        let supported = set(&["eth_sendTransaction", "personal_sign"]);

        let allowed = filter_methods(required, optional, &supported).unwrap();
        assert_eq!(
            allowed,
            vec!["eth_sendTransaction".to_owned(), "personal_sign".to_owned()]
        );
    }

    #[test]
    fn build_eip155_accounts_defaults_to_mainnet_when_no_chains_requested() {
        let accounts = build_eip155_accounts(&[], addr());
        assert_eq!(accounts, vec![format!("eip155:1:{:#x}", addr())]);
    }

    #[test]
    fn build_eip155_accounts_covers_every_requested_chain() {
        let chains = vec!["eip155:1".to_owned(), "eip155:137".to_owned()];
        let accounts = build_eip155_accounts(&chains, addr());
        assert_eq!(
            accounts,
            vec![
                format!("eip155:1:{:#x}", addr()),
                format!("eip155:137:{:#x}", addr()),
            ]
        );
    }

    #[test]
    fn build_eip155_accounts_ignores_non_eip155_chains() {
        let chains = vec!["eip155:1".to_owned(), "cosmos:cosmoshub-4".to_owned()];
        let accounts = build_eip155_accounts(&chains, addr());
        assert_eq!(accounts, vec![format!("eip155:1:{:#x}", addr())]);
    }

    #[test]
    fn build_eip155_accounts_falls_back_to_mainnet_when_only_non_eip155_requested() {
        // A dApp requesting only non-eip155 chains must never settle with an
        // empty accounts list — some dApps reject that outright.
        let chains = vec!["cosmos:cosmoshub-4".to_owned()];
        let accounts = build_eip155_accounts(&chains, addr());
        assert_eq!(accounts, vec![format!("eip155:1:{:#x}", addr())]);
    }
}
