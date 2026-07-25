use ethui_types::Address;
use relay_rpc::domain::Topic;
use serde::Serialize;

use crate::{pairing, session, store::Session};

/// Tauri command error type — serializable so Tauri can forward it to the frontend.
#[derive(Debug, Serialize)]
pub struct WcCommandError(String);

impl From<crate::error::WcError> for WcCommandError {
    fn from(e: crate::error::WcError) -> Self {
        Self(e.to_string())
    }
}

type CmdResult<T> = Result<T, WcCommandError>;

/// Parse and subscribe to a `wc:` URI. The session-proposal dialog will appear
/// asynchronously when the dApp's proposal arrives on the relay.
#[tauri::command]
pub async fn wc_pair(uri: String) -> CmdResult<()> {
    pairing::pair(&uri).await.map_err(Into::into)
}

/// Disconnect an active session and notify the dApp.
#[tauri::command]
pub async fn wc_disconnect(topic: String) -> CmdResult<()> {
    session::disconnect(Topic::from(topic.as_str()))
        .await
        .map_err(Into::into)
}

/// Return the list of active sessions (used by the UI session list).
#[tauri::command]
pub async fn wc_list_sessions() -> CmdResult<Vec<Session>> {
    Ok(session::list_sessions().await)
}

/// Switch the account exposed to a dApp for an existing session.
#[tauri::command]
pub async fn wc_switch_account(topic: String, address: Address) -> CmdResult<()> {
    session::switch_account(Topic::from(topic.as_str()), address)
        .await
        .map_err(Into::into)
}
