use std::time::Duration;

use relay_client::{
    ConnectionOptions,
    error::ClientError,
    websocket::{Client, CloseFrame, ConnectionHandler, PublishedMessage},
};
use relay_rpc::auth::{AuthToken, RELAY_WEBSOCKET_ADDRESS, ed25519_dalek::SigningKey};
use tokio::sync::mpsc;

use crate::error::{WcError, WcResult};

/// ethui's own WalletConnect Cloud project ID, shared by every install unless
/// the user configures their own in settings. Never logged, and never read
/// back anywhere outside this module — only a user-provided override ever
/// round-trips through `Settings`/the frontend.
pub(crate) const DEFAULT_PROJECT_ID: &str = "25df5d97cf325d46df6b1abf570a655d";

/// Builds a relay `Client`, connects to the relay, and returns a channel receiver
/// for all inbound messages.
///
/// `project_id` is resolved by the caller (user override, or [`DEFAULT_PROJECT_ID`]).
pub async fn connect(
    project_id: &str,
) -> WcResult<(Client, mpsc::UnboundedReceiver<PublishedMessage>)> {
    let (tx, rx) = mpsc::unbounded_channel();
    let client = Client::new(Handler { tx });

    let signing_key = SigningKey::generate(&mut rand_core::OsRng);
    let auth = AuthToken::new("https://ethui.dev")
        .aud(RELAY_WEBSOCKET_ADDRESS)
        .ttl(Duration::from_secs(86_400))
        .as_jwt(&signing_key)
        .map_err(|e| WcError::Other(e.to_string()))?;

    let opts = ConnectionOptions::new(project_id.to_owned(), auth);
    client
        .connect(&opts)
        .await
        .map_err(|e| WcError::Other(e.to_string()))?;

    Ok((client, rx))
}

struct Handler {
    tx: mpsc::UnboundedSender<PublishedMessage>,
}

impl ConnectionHandler for Handler {
    fn connected(&mut self) {
        tracing::info!("walletconnect relay connected");
    }

    fn disconnected(&mut self, frame: Option<CloseFrame>) {
        tracing::warn!("walletconnect relay disconnected: {:?}", frame);
    }

    fn message_received(&mut self, message: PublishedMessage) {
        let _ = self.tx.send(message);
    }

    fn inbound_error(&mut self, error: ClientError) {
        tracing::error!("walletconnect inbound error: {error}");
    }

    fn outbound_error(&mut self, error: ClientError) {
        tracing::error!("walletconnect outbound error: {error}");
    }
}
