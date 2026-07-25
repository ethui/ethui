use ethui_settings::SettingsActorExt as _;
use relay_client::websocket::PublishedMessage;
use tokio::sync::mpsc;

use crate::{CLIENT, client::DEFAULT_PROJECT_ID, session};

/// Initialise the WalletConnect subsystem.
///
/// Connects to the relay and spawns the inbound message loop. Uses the
/// user's own WalletConnect Cloud project ID from settings if one is set,
/// otherwise ethui's shared default — the resolved value is never logged.
pub async fn init() {
    let project_id = ethui_settings::settings()
        .get_all()
        .await
        .ok()
        .and_then(|s| s.walletconnect_project_id)
        .unwrap_or_else(|| DEFAULT_PROJECT_ID.to_owned());

    match crate::client::connect(&project_id).await {
        Ok((relay_client, rx)) => {
            CLIENT
                .set(relay_client)
                .unwrap_or_else(|_| tracing::warn!("walletconnect already initialised"));
            tokio::spawn(message_loop(rx));
            tracing::info!("walletconnect initialised");
        }
        Err(e) => {
            tracing::warn!("walletconnect disabled: {e}");
        }
    }
}

async fn message_loop(mut rx: mpsc::UnboundedReceiver<PublishedMessage>) {
    while let Some(msg) = rx.recv().await {
        let topic = msg.topic.clone();
        let tag = msg.tag;
        let raw = msg.message.as_ref().to_owned();
        session::dispatch(topic, tag, &raw).await;
    }
    tracing::warn!("walletconnect message loop ended");
}

/// Disconnects every active WalletConnect session. Call on full app shutdown
/// (not on the main window merely closing to the tray) so connected dApps see
/// a clean disconnect rather than a silently dropped connection.
pub async fn shutdown() {
    session::disconnect_all().await;
}
